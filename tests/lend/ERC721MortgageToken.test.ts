import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    Currency,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    ERC721MortgageToken,
    IERC1155ReceiverUpgradeable__factory,
    ICommon__factory,
    IERC721MetadataUpgradeable__factory,
    IERC721Upgradeable__factory,
    IERC4906Upgradeable__factory,
    IMortgageToken__factory,
    RoyaltyCollection,
    RoyaltyCollection__factory,
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber, Contract, Wallet } from 'ethers';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { deployERC721MortgageToken } from '@utils/deployments/lend/erc721MortgageToken';
import { callERC721MortgageToken_Pause, callERC721MortgageToken_RegisterCollaterals, callERC721MortgageToken_UpdateFeeRate } from '@utils/callWithSignatures/erc721MortgageToken';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Holder';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { MortgageState } from '@utils/models/enums';
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';
import { applyDiscount, scaleRate } from '@utils/formula';
import { ERC721BorrowParams } from '@utils/models/ERC721MortgageToken';
import { getERC721BorrowTx } from '@utils/transaction/ERC721MortgageToken';


async function testReentrancy_erc721MortgageToken(
    erc721MortgageToken: ERC721MortgageToken,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        erc721MortgageToken.interface.encodeFunctionData("lend", [0]),
        erc721MortgageToken.interface.encodeFunctionData("repay", [0]),
        erc721MortgageToken.interface.encodeFunctionData("safeLend", [0, 0]),
        erc721MortgageToken.interface.encodeFunctionData("safeRepay", [0, 0]),
        erc721MortgageToken.interface.encodeFunctionData("foreclose", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        erc721MortgageToken,
        data,
        assertion,
    );
}


interface ERC721MortgageTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    feeReceiverCollection: MockContract<RoyaltyCollection>;
    otherCollection: MockContract<RoyaltyCollection>;
    collaterals: MockContract<RoyaltyCollection>[];
    erc721MortgageToken: ERC721MortgageToken;

    deployer: any;
    admins: any[];
    lender1: any;
    lender2: any;
    borrower1: any;
    borrower2: any;
    manager: any;
    moderator: any;
    royaltyReceiver: any;
    erc721MortgageTokenOwner: any;

    mockCurrencyExclusiveRate: BigNumber;
}

describe('3.2. ERC721MortgageToken', async () => {
    async function erc721MortgageTokenFixture(): Promise<ERC721MortgageTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const lender1 = accounts[Constant.ADMIN_NUMBER + 1];
        const lender2 = accounts[Constant.ADMIN_NUMBER + 2];
        const borrower1 = accounts[Constant.ADMIN_NUMBER + 3];
        const borrower2 = accounts[Constant.ADMIN_NUMBER + 4];
        const manager = accounts[Constant.ADMIN_NUMBER + 5];
        const moderator = accounts[Constant.ADMIN_NUMBER + 6];
        const royaltyReceiver = accounts[Constant.ADMIN_NUMBER + 7];
        const erc721MortgageTokenOwner = accounts[Constant.ADMIN_NUMBER + 8];

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const feeReceiver = await deployFeeReceiver(
            deployer.address,
            admin.address
        ) as FeeReceiver;

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;
        const mockCurrencyExclusiveRate = ethers.utils.parseEther('0.3');
        await callTransaction(currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));

        const SmockCollectionFactory = await smock.mock<RoyaltyCollection__factory>("RoyaltyCollection");
        const feeReceiverCollection = await SmockCollectionFactory.deploy();
        await feeReceiverCollection.initialize(
            admin.address,
            feeReceiver.address,
            ethers.utils.parseEther("0.1"),       
            'FeeReceiverCollection',
            'FRC',
        );
        const otherCollection = await SmockCollectionFactory.deploy();
        await otherCollection.initialize(
            admin.address,
            royaltyReceiver.address,
            ethers.utils.parseEther("0.2"),          
            'OtherCollection',
            'OTC',
        );

        const collaterals = [];
        for (let i = 0; i < 5; ++i) {
            const collateral = await SmockCollectionFactory.deploy();
            await collateral.initialize(
                admin.address,
                royaltyReceiver.address,
                ethers.utils.parseEther("0.3"),
                `Collateral_${i}`,
                `CLT${i}`,
            );
            collaterals.push(collateral);
        }

        const erc721MortgageToken = await deployERC721MortgageToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
        ) as ERC721MortgageToken;

        return {
            admin,
            feeReceiver,
            currency,
            feeReceiverCollection,
            otherCollection,
            collaterals,
            erc721MortgageToken,
            deployer,
            admins,
            manager,
            moderator,
            royaltyReceiver,
            lender1,
            lender2,
            borrower1,
            borrower2,
            mockCurrencyExclusiveRate,
            erc721MortgageTokenOwner,
        };
    };

    async function beforeERC721MortgageTokenTest({
        skipSetApprovalForAll = false,
        skipRegisterCollaterals = false,
        listSampleCurrencies = false,
        listSampleCollectionTokens = false,
        listSampleMortgage = false,
        listSampleLending = false,
        pause = false,
    } = {}): Promise<ERC721MortgageTokenFixture> {
        const fixture = await loadFixture(erc721MortgageTokenFixture);

        const {
            admin,
            admins,
            currency,
            feeReceiverCollection,
            otherCollection,
            collaterals,
            erc721MortgageToken,
            borrower1,
            borrower2,
            lender1,
            lender2,
            manager,
            moderator,
            royaltyReceiver,
        } = fixture;

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce()
        );

        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce()
        );

        if (!skipRegisterCollaterals) {
            await callERC721MortgageToken_RegisterCollaterals(
                erc721MortgageToken,
                admins,
                [feeReceiverCollection.address, otherCollection.address],
                true,
                await admin.nonce()
            );
        }

        let currentTimestamp = await time.latest();

        if (listSampleCurrencies) {
            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [ethers.constants.AddressZero, currency.address],
                [true, true],
                [false, true],
                await admin.nonce(),
            );
        }

        if (listSampleCollectionTokens) {
            for(const collection of [feeReceiverCollection, otherCollection]) {
                await callTransaction(collection.mint(borrower1.address, 1));
                await callTransaction(collection.mint(borrower2.address, 2));

                if (!skipSetApprovalForAll) {
                    await callTransaction(collection.connect(borrower1).setApprovalForAll(erc721MortgageToken.address, true));
                    await callTransaction(collection.connect(borrower2).setApprovalForAll(erc721MortgageToken.address, true));
                }
            }
        }

        if (listSampleMortgage) {
            await callTransaction(getERC721BorrowTx(erc721MortgageToken, borrower1, {
                token: feeReceiverCollection.address,
                tokenId: BigNumber.from(1),
                principal: BigNumber.from(10e5),
                repayment: BigNumber.from(11e5),
                currency: ethers.constants.AddressZero,
                duration: BigNumber.from(1000),
            }));

            await callTransaction(getERC721BorrowTx(erc721MortgageToken, borrower2, {
                token: otherCollection.address,
                tokenId: BigNumber.from(2),
                principal: BigNumber.from(100000),
                repayment: BigNumber.from(110000),
                currency: currency.address,
                duration: BigNumber.from(1000),
            }));    
            
            await prepareERC20(
                currency,
                [borrower1, borrower2, lender1, lender2],
                [erc721MortgageToken],
                1e9
            );
        }
        
        if (listSampleLending) {
            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(erc721MortgageToken.connect(lender2).lend(2));
        }

        if (pause) {
            await callERC721MortgageToken_Pause(
                erc721MortgageToken,
                admins,
                await admin.nonce()
            );
        }

        return {
            ...fixture,
        }
    }

    describe('3.2.1. initialize(address, address, address, address, string, string, string, uint256, uint256)', async () => {
        it('3.2.1.1. Deploy successfully', async () => {
            const { admin, feeReceiver, erc721MortgageToken } = await beforeERC721MortgageTokenTest();

            const tx = erc721MortgageToken.deployTransaction;
            await expect(tx).to.emit(erc721MortgageToken, "BaseURIUpdate").withArgs(LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI);
            await expect(tx).to.emit(erc721MortgageToken, "FeeRateUpdate").withArgs(
                (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(0);

            const feeRate = await erc721MortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await erc721MortgageToken.admin()).to.equal(admin.address);
            expect(await erc721MortgageToken.feeReceiver()).to.equal(feeReceiver.address);
        });


        it('3.2.1.2. Deploy unsuccessfully with invalid fee rate', async () => {
            const { deployer, admin, feeReceiver } = await beforeERC721MortgageTokenTest();

            const ERC721MortgageToken = await ethers.getContractFactory('ERC721MortgageToken', deployer);

            await expect(upgrades.deployProxy(ERC721MortgageToken, [
                admin.address,
                feeReceiver.address,
                LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
                LendInitialization.ERC721_MORTGAGE_TOKEN_Symbol,
                LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('3.2.2. updateBaseURI(string, bytes[])', async () => {
        it('3.2.2.1. updateBaseURI successfully with valid signatures', async () => {
            const { erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [erc721MortgageToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await erc721MortgageToken.updateBaseURI("NewBaseURI:", signatures);
            await tx.wait();

            await expect(tx).to
                .emit(erc721MortgageToken, 'BaseURIUpdate')
                .withArgs("NewBaseURI:");

            expect(await erc721MortgageToken.tokenURI(1)).to.equal("NewBaseURI:1");
            expect(await erc721MortgageToken.tokenURI(2)).to.equal("NewBaseURI:2");
        });

        it('3.2.2.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
            const { erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [erc721MortgageToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(erc721MortgageToken.updateBaseURI(
                "NewBaseURI:",
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('3.2.3. updateFeeRate(uint256, bytes[])', async () => {
        it('3.2.3.1. updateFeeRate successfully with valid signatures', async () => {
            const { erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const rateValue = ethers.utils.parseEther('0.2');

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [erc721MortgageToken.address, "updateFeeRate", rateValue]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await erc721MortgageToken.updateFeeRate(rateValue, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(erc721MortgageToken, 'FeeRateUpdate')
                .withArgs(
                    (rate: any) => {
                        expect(structToObject(rate)).to.deep.equal({
                            value: rateValue,
                            decimals: Constant.COMMON_RATE_DECIMALS,
                        });
                        return true;
                    }
                );

            const feeRate = await erc721MortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: rateValue,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('3.2.3.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [erc721MortgageToken.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(erc721MortgageToken.updateFeeRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.2.3.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [erc721MortgageToken.address, "updateFeeRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(erc721MortgageToken.updateFeeRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRate');
        });
    });

    describe('3.2.4. registerCollaterals(address[], bool, bytes[])', async () => {
        it('3.2.4.1. Register collaterals successfully with valid signatures', async () => {
            const { erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            const toBeCollaterals = collaterals.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', toBeCollaterals.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await erc721MortgageToken.registerCollaterals(
                toBeCollaterals.map(x => x.address),
                true,
                signatures
            );
            await tx.wait();

            for (const collateral of toBeCollaterals) {
                await expect(tx).to
                    .emit(erc721MortgageToken, 'CollateralRegistration')
                    .withArgs(collateral.address);
            }

            for (const collateral of collaterals) {
                const isCollateral = await erc721MortgageToken.isCollateral(collateral.address);
                if (toBeCollaterals.includes(collateral)) {
                    expect(isCollateral).to.be.true;
                } else {
                    expect(isCollateral).to.be.false;
                }
            }
        });

        it('3.2.4.2. Register collaterals unsuccessfully with invalid signatures', async () => {
            const { erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            const toBeCollaterals = collaterals.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', toBeCollaterals.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(erc721MortgageToken.registerCollaterals(
                toBeCollaterals.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.2.4.3. Register collaterals reverted without reason with EOA address', async () => {
            const { erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const invalidCollateral = randomWallet();

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', [invalidCollateral.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(erc721MortgageToken.registerCollaterals(
                [invalidCollateral.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCollateral');
        })

        it('3.2.4.4. Authorize launchpad reverted with contract not supporting ProjectLaunchpad interface', async () => {
            const { erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const invalidCollateral = erc721MortgageToken;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', [invalidCollateral.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(erc721MortgageToken.registerCollaterals(
                [invalidCollateral.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCollateral');
        })

        it('3.2.4.5. Authorize launchpad unsuccessfully when authorizing same account twice on same tx', async () => {
            const { erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            const duplicateCollaterals = [collaterals[0], collaterals[1], collaterals[2], collaterals[0]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', duplicateCollaterals.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(erc721MortgageToken.registerCollaterals(
                duplicateCollaterals.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(erc721MortgageToken, `RegisteredCollateral`)
        });

        it('3.2.4.6. Authorize launchpad unsuccessfully when authorizing same account twice on different tx', async () => {
            const { erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            const tx1Collaterals = collaterals.slice(0, 3);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', tx1Collaterals.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(erc721MortgageToken.registerCollaterals(
                tx1Collaterals.map(x => x.address),
                true,
                signatures
            ));

            const tx2Collaterals = [collaterals[3], collaterals[2], collaterals[4]];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', tx2Collaterals.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(erc721MortgageToken.registerCollaterals(
                tx2Collaterals.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(erc721MortgageToken, `RegisteredCollateral`)
        })

        async function setupCollaterals(erc721MortgageToken: ERC721MortgageToken, admin: Admin, admins: any[], collaterals: any[]) {
            await callERC721MortgageToken_RegisterCollaterals(
                erc721MortgageToken as any,
                admins,
                collaterals.map(x => x.address),
                true,
                await admin.nonce(),
            );
        }

        it('3.2.4.7. Deregister collaterals successfully', async () => {
            const { erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            await setupCollaterals(erc721MortgageToken, admin, admins, collaterals);

            const toDeregister = collaterals.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', toDeregister.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await erc721MortgageToken.registerCollaterals(
                toDeregister.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();

            for (const collateral of toDeregister) {
                await expect(tx).to
                    .emit(erc721MortgageToken, 'CollateralDeregistration')
                    .withArgs(collateral.address);
            }

            for (const collateral of collaterals) {
                const isCollateral = await erc721MortgageToken.isCollateral(collateral.address);
                if (toDeregister.includes(collateral)) {
                    expect(isCollateral).to.be.false;
                } else {
                    expect(isCollateral).to.be.true;
                }
            }            
        });

        it('3.2.4.8. Deregister collaterals unsuccessfully with unauthorized account', async () => {
            const { erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            await setupCollaterals(erc721MortgageToken, admin, admins, collaterals);

            const account = randomWallet();
            const toDeauth = [collaterals[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(erc721MortgageToken.registerCollaterals(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(erc721MortgageToken, `NotRegisteredCollateral`)
        });

        it('7.2.4.8. Deauthorize launchpad unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const { erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            await setupCollaterals(erc721MortgageToken, admin, admins, collaterals);

            const toDeauth = collaterals.slice(0, 2).concat([collaterals[0]]);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(erc721MortgageToken.registerCollaterals(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(erc721MortgageToken, `NotRegisteredCollateral`)
        });

        it('7.2.4.9. Deauthorize launchpad unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const { erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            await setupCollaterals(erc721MortgageToken, admin, admins, collaterals);

            const tx1Accounts = collaterals.slice(0, 2);
            await callERC721MortgageToken_RegisterCollaterals(
                erc721MortgageToken as any,
                admins,
                tx1Accounts.map(x => x.address),
                false,
                await admin.nonce()
            );

            const tx2Accounts = [collaterals[0]];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [erc721MortgageToken.address, 'registerCollaterals', tx2Accounts.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(erc721MortgageToken.registerCollaterals(
                tx2Accounts.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(erc721MortgageToken, `NotRegisteredCollateral`)
        });
    });

    describe('3.2.4. borrow(uint256, uint256, uint256, uint256, address, uint40)', async () => {
        async function beforeBorrowTest(fixture: ERC721MortgageTokenFixture): Promise<{ defaultParams: ERC721BorrowParams }> {
            const { feeReceiverCollection } = fixture;
            return {
                defaultParams: {
                    token: feeReceiverCollection.address,
                    tokenId: BigNumber.from(1),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: BigNumber.from(1000),
                }
            }
        }

        it('3.2.4.1. create mortgage successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, admin, borrower1, borrower2, currency, feeReceiverCollection, otherCollection } = fixture;

            const params1: ERC721BorrowParams = {
                token: feeReceiverCollection.address,
                tokenId: BigNumber.from(1),
                principal: BigNumber.from(10e5),
                repayment: BigNumber.from(11e5),
                currency: ethers.constants.AddressZero,
                duration: BigNumber.from(1000),
            }

            const tx1 = await getERC721BorrowTx(erc721MortgageToken, borrower1, params1);
            await tx1.wait();
            
            const mortgage1 = await erc721MortgageToken.getMortgage(1);
            const fee1 = scaleRate(mortgage1.principal, await erc721MortgageToken.getFeeRate());

            await expect(tx1).to.emit(erc721MortgageToken, 'NewMortgage').withArgs(
                1,
                borrower1.address,
                params1.principal,
                params1.repayment,
                fee1,
                params1.currency,
                params1.duration
            );

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(1);
            
            const collateral1 = await erc721MortgageToken.getCollateral(1);
            expect(collateral1.token).to.equal(params1.token);
            expect(collateral1.tokenId).to.equal(params1.tokenId);

            expect(mortgage1.principal).to.equal(params1.principal);
            expect(mortgage1.repayment).to.equal(params1.repayment);
            expect(mortgage1.fee).to.equal(fee1);
            expect(mortgage1.currency).to.equal(params1.currency);
            expect(mortgage1.due).to.equal(params1.duration);
            expect(mortgage1.state).to.equal(MortgageState.Pending);
            expect(mortgage1.borrower).to.equal(borrower1.address);
            expect(mortgage1.lender).to.equal(ethers.constants.AddressZero);

            expect(await feeReceiverCollection.ownerOf(1)).to.equal(erc721MortgageToken.address);

            const params2: ERC721BorrowParams = {
                token: otherCollection.address,
                tokenId: BigNumber.from(2),
                principal: BigNumber.from(100000),
                repayment: BigNumber.from(110000),
                currency: currency.address,
                duration: BigNumber.from(1000),
            }

            const tx2 = await getERC721BorrowTx(erc721MortgageToken, borrower2, params2);
            await tx2.wait();

            const mortgage2 = await erc721MortgageToken.getMortgage(2);
            const fee2 = await applyDiscount(
                admin, 
                scaleRate(mortgage2.principal, await erc721MortgageToken.getFeeRate()),
                currency
            );

            await expect(tx2).to.emit(erc721MortgageToken, 'NewMortgage').withArgs(
                2,
                borrower2.address,
                params2.principal,
                params2.repayment,
                fee2,
                params2.currency,
                params2.duration
            );

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(2);

            const collateral2 = await erc721MortgageToken.getCollateral(2);
            expect(collateral2.token).to.equal(params2.token);
            expect(collateral2.tokenId).to.equal(params2.tokenId);

            expect(mortgage2.principal).to.equal(params2.principal);
            expect(mortgage2.repayment).to.equal(params2.repayment);
            expect(mortgage2.fee).to.equal(fee2);
            expect(mortgage2.currency).to.equal(params2.currency);
            expect(mortgage2.due).to.equal(params2.duration);
            expect(mortgage2.state).to.equal(MortgageState.Pending);
            expect(mortgage2.borrower).to.equal(borrower2.address);
            expect(mortgage2.lender).to.equal(ethers.constants.AddressZero);

            expect(await otherCollection.ownerOf(2)).to.equal(erc721MortgageToken.address);
        });

        it('3.2.4.2. create mortgage unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                pause: true
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(getERC721BorrowTx(erc721MortgageToken, borrower1, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('3.2.4.3. create mortgage unsuccessfully with invalid erc721 id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            const params1: ERC721BorrowParams = {
                ...defaultParams,
                tokenId: BigNumber.from(0),
            }
            await expect(getERC721BorrowTx(erc721MortgageToken, borrower1, params1))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidTokenId');

            const params2: ERC721BorrowParams = {
                ...defaultParams,
                tokenId: BigNumber.from(3),
            }
            await expect(getERC721BorrowTx(erc721MortgageToken, borrower1, params2))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidTokenId');
        });

        it('3.2.4.4. create mortgage unsuccessfully with invalid currency', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);
            
            await expect(getERC721BorrowTx(erc721MortgageToken, borrower1, defaultParams))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCurrency');
        });

        it('3.2.4.5. create mortgage unsuccessfully with zero amount', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, feeReceiverCollection, borrower2 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const params: ERC721BorrowParams = {
                ...defaultParams,
                token: feeReceiverCollection.address,
                tokenId: BigNumber.from(1),
            }
            await expect(getERC721BorrowTx(erc721MortgageToken, borrower2, params))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCollateral');
        });


        it('3.2.4.6. create mortgage unsuccessfully with invalid principal', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const params: ERC721BorrowParams = {
                ...defaultParams,
                principal: BigNumber.from(0),
            }
            await expect(getERC721BorrowTx(erc721MortgageToken, borrower1, params))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidPrincipal');
        });

        it('3.2.4.7. create mortgage unsuccessfully with invalid repayment', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const params: ERC721BorrowParams = {
                ...defaultParams,
                repayment: defaultParams.principal.sub(1),
            }
            await expect(getERC721BorrowTx(erc721MortgageToken, borrower1, params))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepayment');
        });
    });

    describe('3.2.5. cancel(uint256)', async () => {
        it('3.2.5.1. cancel mortgage successfully by borrower', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            let tx = await erc721MortgageToken.connect(borrower1).cancel(1);
            await tx.wait();

            expect(tx).to
                .emit(erc721MortgageToken, 'MortgageCancellation')
                .withArgs(1);

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await erc721MortgageToken.getMortgage(1);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.2.5.2. cancel mortgage successfully by manager', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, manager } = fixture;

            let tx = await erc721MortgageToken.connect(manager).cancel(2);
            await tx.wait();

            expect(tx).to
                .emit(erc721MortgageToken, 'MortgageCancellation')
                .withArgs(2);

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await erc721MortgageToken.getMortgage(2);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.2.5.3. cancel mortgage unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1, moderator } = fixture;
            await expect(erc721MortgageToken.connect(lender1).cancel(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'Unauthorized');
            await expect(erc721MortgageToken.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'Unauthorized');
        });

        it('3.2.5.4. cancel mortgage unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;
            await expect(erc721MortgageToken.connect(borrower1).cancel(0))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');

            await expect(erc721MortgageToken.connect(borrower1).cancel(3))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');
        });

        it('3.2.5.5. cancel mortgage unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;
            await callTransaction(erc721MortgageToken.connect(borrower1).cancel(1));

            await expect(erc721MortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCancelling');
        });

        it('3.2.5.6. cancel mortgage unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await expect(erc721MortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCancelling');
        });

        it('3.2.5.7. cancel mortgage unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            const due = (await erc721MortgageToken.getMortgage(1)).due;

            await time.setNextBlockTimestamp(due);
            await callTransaction(erc721MortgageToken.connect(lender1).foreclose(1));

            await expect(erc721MortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCancelling');
        });

        it('3.2.5.8. cancel mortgage unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await callTransaction(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            await expect(erc721MortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCancelling');
        });
    });

    describe('3.2.6. lend(uint256)', async () => {
        async function testLend(
            fixture: ERC721MortgageTokenFixture,
            currencyExclusiveRate: BigNumber,
            erc721MortgageTokenFeeRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            principal: BigNumber,
            repayment: BigNumber,
            isSafeLend: boolean
        ) {
            const { erc721MortgageToken, admin, admins, deployer, borrower1, lender1, feeReceiver, feeReceiverCollection } = fixture;

            const borrower = borrower1;
            const lender = lender1;
            
            await callERC721MortgageToken_UpdateFeeRate(erc721MortgageToken, admins, erc721MortgageTokenFeeRate, await admin.nonce());

            let collection = feeReceiverCollection;

            const currentTokenId = (await collection.tokenNumber()).add(1);
            const currentMortgageId = (await erc721MortgageToken.mortgageNumber()).add(1);
    
            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;
            if (isERC20) {
                newCurrency = await deployCurrency(
                    deployer.address,
                    `NewMockCurrency_${currentMortgageId}`,
                    `NMC_${currentMortgageId}`
                ) as Currency;
                await newCurrency.setExclusiveDiscount(currencyExclusiveRate, Constant.COMMON_RATE_DECIMALS);
                newCurrencyAddress = newCurrency.address;
            } else {
                newCurrencyAddress = ethers.constants.AddressZero;
            }
            
            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce()
            );

            let currentTimestamp = await time.latest() + 10;

            await callTransaction(collection.mint(borrower.address, currentTokenId));
            await callTransaction(collection.connect(borrower).setApprovalForAll(erc721MortgageToken.address, true));
    
            const walletsToReset = [feeReceiver];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
            }

            const due = 1000;

            let receipt = await callTransaction(erc721MortgageToken.connect(borrower).borrow(
                collection.address,
                currentTokenId,
                principal,
                repayment,
                newCurrencyAddress,
                due
            ));

            let fee = principal.mul(erc721MortgageTokenFeeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                fee = fee.sub(fee.mul(currencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [lender], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [lender], [erc721MortgageToken], principal);
            } else {
                ethValue = principal;
                await prepareNativeToken(ethers.provider, deployer, [lender], principal);
            }

            let currentTotalSupply = await erc721MortgageToken.totalSupply();

            let initBorrowerBalance = await getBalance(ethers.provider, borrower.address, newCurrency);
            let initLenderBalance = await getBalance(ethers.provider, lender.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);

            let tx;
            if (isSafeLend) {
                tx = await erc721MortgageToken.connect(lender).lend(
                    currentMortgageId,
                    { value: ethValue }
                );
            } else {
                tx = await erc721MortgageToken.connect(lender).safeLend(
                    currentMortgageId,
                    principal,
                    { value: ethValue }
                );
            }
            receipt = await tx.wait();

            let expectedBorrowerBalance = initBorrowerBalance.add(principal).sub(fee);
            let expectedLenderBalance = initLenderBalance.sub(principal);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(fee);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedLenderBalance = expectedLenderBalance.sub(gasFee);
            }

            await expect(tx).to.emit(erc721MortgageToken, 'NewToken').withArgs(
                currentMortgageId,
                lender.address,
                currentTimestamp + due,
            );

            const mortgage = await erc721MortgageToken.getMortgage(currentMortgageId);
            expect(mortgage.due).to.equal(currentTimestamp + due);
            expect(mortgage.state).to.equal(MortgageState.Supplied);
            expect(mortgage.lender).to.equal(lender.address);

            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.add(1));

            expect(await getBalance(ethers.provider, borrower.address, newCurrency)).to.equal(expectedBorrowerBalance);
            expect(await getBalance(ethers.provider, lender.address, newCurrency)).to.equal(expectedLenderBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);

            expect(await erc721MortgageToken.ownerOf(currentMortgageId)).to.equal(lender.address);

            if (isERC20) {
                await resetERC20(newCurrency!, [borrower, lender, feeReceiver]);
            } else {
                await resetNativeToken(ethers.provider, [borrower, lender, feeReceiver]);
                await prepareNativeToken(ethers.provider, deployer, [borrower, lender], ethers.utils.parseEther("1.0"));
            }
        }

        it('3.2.6.1. lend successfully in native and erc20 token', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            await testLend(
                fixture,
                fixture.mockCurrencyExclusiveRate,
                LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                false,
                false,
                ethers.BigNumber.from(10e5),
                ethers.BigNumber.from(11e5),
                false,
            )

            await testLend(
                fixture,
                fixture.mockCurrencyExclusiveRate,
                LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                true,
                true,
                ethers.BigNumber.from(100000),
                ethers.BigNumber.from(110000),
                false,
            )
        });

        it('3.2.6.2. lend successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    await testLend(
                        fixture,
                        fixture.mockCurrencyExclusiveRate,
                        LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(10e5),
                        ethers.BigNumber.from(11e5),
                        false,
                    )
                }
            }
        });

        it('3.2.6.3. lend successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    const amount = ethers.BigNumber.from(2).pow(255);
                    const principal = ethers.BigNumber.from(2).pow(255);
                    const repayment = principal.add(1);
                    await testLend(
                        fixture,
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        principal,
                        repayment,
                        false,
                    )
                }
            }
        });

        it('3.2.6.4. lend successfully in 100 random test cases', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            for (let testcase = 0; testcase < 100; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                const feeRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther("1.0"));
                const exclusiveRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther("1.0"));

                if (isExclusive && !isERC20) {
                    --testcase;
                    continue;
                }

                let randomNums = []

                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(255);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const principal = randomNums[0];
                const repayment = randomNums[1];

                await testLend(
                    fixture,
                    exclusiveRate,
                    feeRate,
                    isERC20,
                    isExclusive,
                    principal,
                    repayment,
                    false,
                );
            }
        });

        it('3.2.6.5. lend unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                pause: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).lend(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.2.6.6. lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).lend(0, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");

            await expect(erc721MortgageToken.connect(borrower1).lend(3, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");
        });

        it('3.2.6.7. lend unsuccessfully when borrower lend their own mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");

            await expect(erc721MortgageToken.connect(borrower2).lend(2, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");
        });

        it('3.2.6.8. lend unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await expect(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");
            await expect(erc721MortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");
        });

        it('3.2.6.9. lend unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await callTransaction(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            await expect(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");
            await expect(erc721MortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");
        });

        it('3.2.6.10. lend unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(erc721MortgageToken.connect(borrower1).cancel(1));

            await expect(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");
        });

        it('3.2.6.11. lend unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1, lender2 } = fixture;

            await callTransaction(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            const due = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(erc721MortgageToken.connect(lender1).foreclose(1));

            await expect(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");
            await expect(erc721MortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidLending");
        });

        it('3.2.6.12. lend unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1 } = fixture;

            await expect(erc721MortgageToken.connect(lender1).lend(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InsufficientValue");
        });

        it('3.2.6.13. lend unsuccessfully when native token transfer to borrower failed', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, lender1, deployer, feeReceiverCollection } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(feeReceiverCollection.mint(failReceiver.address, 1));
            await callTransaction(failReceiver.call(
                feeReceiverCollection.address,
                feeReceiverCollection.interface.encodeFunctionData("setApprovalForAll", [erc721MortgageToken.address, true])
            ));

            const data = erc721MortgageToken.interface.encodeFunctionData("borrow", [
                feeReceiverCollection.address,
                1,
                10e5,
                11e5,
                ethers.constants.AddressZero,
                1000
            ]);
            await callTransaction(failReceiver.call(erc721MortgageToken.address, data));

            await expect(erc721MortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "FailedTransfer");
        });

        it('3.2.6.15. buy token unsuccessfully when refund to lender failed', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, deployer } = fixture;
            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = erc721MortgageToken.interface.encodeFunctionData("lend", [1]);

            await expect(failReceiver.call(erc721MortgageToken.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "FailedRefund");
        });

        it('3.2.6.16. buy token unsuccessfully when borrower reenter this function', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, deployer, feeReceiverCollection, lender1 } = fixture;

            const reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callTransaction(feeReceiverCollection.mint(reentrancy.address, 1));

            await callTransaction(reentrancy.call(
                feeReceiverCollection.address,
                feeReceiverCollection.interface.encodeFunctionData("setApprovalForAll", [
                    erc721MortgageToken.address,
                    true
                ])
            ));

            await callTransaction(reentrancy.call(
                erc721MortgageToken.address,
                erc721MortgageToken.interface.encodeFunctionData("borrow", [
                    feeReceiverCollection.address,
                    1,
                    10e5,
                    11e5,
                    ethers.constants.AddressZero,
                    1000
                ])
            ));

            const mortgageId = 1;

            await testReentrancy_erc721MortgageToken(
                erc721MortgageToken,
                reentrancy,
                async () => {
                    await expect(erc721MortgageToken.connect(lender1).lend(mortgageId, { value: 1e9 }))
                        .to.be.revertedWithCustomError(erc721MortgageToken, "FailedTransfer");
                },
            );
        });
    });

    describe('3.2.7. safeLend(uint256, uint256)', async () => {
        it('3.2.7.1. safe lend successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            const anchor1 = (await erc721MortgageToken.getMortgage(1)).principal;
            await expect(erc721MortgageToken.connect(borrower2).safeLend(1, anchor1, { value: 1e9 }))
                .to.not.be.reverted;

            const anchor2 = (await erc721MortgageToken.getMortgage(2)).principal;
            await expect(erc721MortgageToken.connect(borrower1).safeLend(2, anchor2))
                .to.not.be.reverted;
        });

        it('3.2.7.2. safe lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).safeLend(0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");

            await expect(erc721MortgageToken.connect(borrower1).safeLend(3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");
        });


        it('3.2.7.3. safe lend unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1 } = fixture;

            await expect(erc721MortgageToken.connect(lender1).safeLend(1, 0, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "BadAnchor");

            await expect(erc721MortgageToken.connect(lender1).safeLend(2, 0, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "BadAnchor");
        });
    });
    
    describe('3.2.8. repay(uint256)', () => {
        it('3.2.8.1. repay successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2, lender1, lender2, feeReceiverCollection, currency, erc721MortgageTokenOwner, otherCollection } = fixture;

            let currentTimestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(currentTimestamp);

            let due = (await erc721MortgageToken.getMortgage(1)).due;
            let lender1NativeBalance = await ethers.provider.getBalance(lender1.address);
            let borrower1NativeBalance = await ethers.provider.getBalance(borrower1.address);
            let currentTotalSupply = await erc721MortgageToken.totalSupply();

            let tx = await erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 });
            let receipt = await tx.wait();
            let gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx)
                .to.emit(erc721MortgageToken, 'MortgageRepayment')
                .withArgs(1);

            const mortgage1 = await erc721MortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Repaid);

            expect(await erc721MortgageToken.balanceOf(borrower1.address)).to.equal(0);

            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));
            
            expect(await feeReceiverCollection.ownerOf(1)).to.equal(borrower1.address);

            expect(await ethers.provider.getBalance(borrower1.address)).to.equal(borrower1NativeBalance.sub(gasFee).sub(11e5));
            expect(await ethers.provider.getBalance(lender1.address)).to.equal(lender1NativeBalance.add(11e5));

            await callTransaction(erc721MortgageToken.connect(lender2).transferFrom(
                lender2.address,
                erc721MortgageTokenOwner.address,
                2
            ));

            due = (await erc721MortgageToken.getMortgage(2)).due;
            let borrower2CurrencyBalance = await currency.balanceOf(borrower2.address);
            let lender2CurrencyBalance = await currency.balanceOf(lender2.address);
            let erc721MortgageTokenOwnerBalance = await currency.balanceOf(erc721MortgageTokenOwner.address);            

            tx = await erc721MortgageToken.connect(borrower2).repay(2, { value: 1e9 });
            await tx.wait();

            await expect(tx)
                .to.emit(erc721MortgageToken, 'MortgageRepayment')
                .withArgs(2);

            const mortgage2 = await erc721MortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Repaid);

            expect(await erc721MortgageToken.balanceOf(borrower2.address)).to.equal(0);
            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await otherCollection.ownerOf(2)).to.equal(borrower2.address);

            expect(await currency.balanceOf(borrower2.address)).to.equal(borrower2CurrencyBalance.sub(110000));
            expect(await currency.balanceOf(lender2.address)).to.equal(lender2CurrencyBalance);
            expect(await currency.balanceOf(erc721MortgageTokenOwner.address)).to.equal(erc721MortgageTokenOwnerBalance.add(110000));
        });

        it('3.2.8.2. repay unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.2.8.3. repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).repay(0))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");

            await expect(erc721MortgageToken.connect(borrower1).repay(3))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");
        });

        it('3.2.8.4. repay unsuccessfully with overdue mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            const due1 = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            await expect(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "Overdue");

            const due2 = (await erc721MortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            await expect(erc721MortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(erc721MortgageToken, "Overdue");
        });

        it('3.2.8.5. repay unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidRepaying");
            await expect(erc721MortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidRepaying");
        });

        it('3.2.8.6. repay unsuccessfully with already repaid mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }));
            await callTransaction(erc721MortgageToken.connect(borrower2).repay(2));

            await expect(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidRepaying");
            await expect(erc721MortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidRepaying");
        });

        it('3.2.8.7. repay unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            const due = (await erc721MortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(erc721MortgageToken.connect(borrower1).foreclose(1));
            await callTransaction(erc721MortgageToken.connect(borrower2).foreclose(2));

            await expect(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidRepaying");
            await expect(erc721MortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidRepaying");
        });

        it('3.2.8.8. repay unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(erc721MortgageToken.connect(borrower1).cancel(1));
            await callTransaction(erc721MortgageToken.connect(borrower2).cancel(2));

            await expect(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidRepaying");
            await expect(erc721MortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidRepaying");
        });

        it('3.2.8.9. repay unsuccessfully with insufficient funds', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2, currency } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).repay(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InsufficientValue");

            await resetERC20(currency, [borrower2])
            await expect(erc721MortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it('3.2.8.10. repay unsuccessfully native token transfer to lender failed', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            const principal = (await erc721MortgageToken.getMortgage(1)).principal;

            let data = erc721MortgageToken.interface.encodeFunctionData("lend", [1]);
            await callTransaction(failReceiver.call(erc721MortgageToken.address, data, { value: principal }));

            await expect(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721MortgageToken, "FailedTransfer");
        });

        it('3.2.8.11. repay unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, deployer } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            const principal = (await erc721MortgageToken.getMortgage(1)).principal;

            let data = erc721MortgageToken.interface.encodeFunctionData("lend", [1]);
            await callTransaction(reentrancy.call(erc721MortgageToken.address, data, { value: principal }));

            await testReentrancy_erc721MortgageToken(
                erc721MortgageToken,
                reentrancy,
                async () => {
                    await expect(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                        .to.be.revertedWithCustomError(erc721MortgageToken, "FailedTransfer");
                },
            );
        });
    });
    
    describe('3.2.9. safeRepay(uint256, uint256)', () => {
        it('3.2.9.1. safe repay successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            const anchor1 = (await erc721MortgageToken.getMortgage(1)).repayment;
            await expect(erc721MortgageToken.connect(borrower1).safeRepay(1, anchor1, { value: 1e9 }))
                .to.not.be.reverted;

            const anchor2 = (await erc721MortgageToken.getMortgage(2)).repayment;
            await expect(erc721MortgageToken.connect(borrower2).safeRepay(2, anchor2))
                .to.not.be.reverted;
        });

        it('3.2.9.2. safe repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).safeRepay(0, 0))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");

            await expect(erc721MortgageToken.connect(borrower1).safeRepay(3, 3))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");
        });

        it('3.2.9.3. repay unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(erc721MortgageToken.connect(borrower1).safeRepay(1, 0))
                .to.be.revertedWithCustomError(erc721MortgageToken, "BadAnchor");

            await expect(erc721MortgageToken.connect(borrower1).safeRepay(2, 0))
                .to.be.revertedWithCustomError(erc721MortgageToken, "BadAnchor");
        });
    });

    describe('3.2.10. foreclose(uint256)', () => {
        it('3.2.10.1. foreclose successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, feeReceiverCollection, otherCollection, lender1, lender2, erc721MortgageTokenOwner } = fixture;

            let currentTotalSupply = await erc721MortgageToken.totalSupply();

            // Tx1: lender1 foreclose mortgage 1, receiver is lender1
            const due1 = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            let tx = await erc721MortgageToken.foreclose(1);
            await tx.wait();

            await expect(tx)
                .to.emit(erc721MortgageToken, 'MortgageForeclosure')
                .withArgs(1, lender1.address);

            const mortgage1 = await erc721MortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Foreclosed);

            expect(await erc721MortgageToken.balanceOf(lender1.address)).to.equal(0);

            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await feeReceiverCollection.ownerOf(1)).to.equal(lender1.address);

            // Tx2: lender2 foreclose mortgage 2, receiver is another user
            await callTransaction(erc721MortgageToken.connect(lender2).transferFrom(
                lender2.address,
                erc721MortgageTokenOwner.address,
                2
            ));

            const due2 = (await erc721MortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            tx = await erc721MortgageToken.foreclose(2);
            await tx.wait();

            await expect(tx)
                .to.emit(erc721MortgageToken, 'MortgageForeclosure')
                .withArgs(2, erc721MortgageTokenOwner.address);

            const mortgage2 = await erc721MortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Foreclosed);

            expect(await erc721MortgageToken.balanceOf(lender2.address)).to.equal(0);

            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await otherCollection.ownerOf(2)).to.equal(erc721MortgageTokenOwner.address);
        });

        it('3.2.10.2. foreclose unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { erc721MortgageToken } = fixture;

            await expect(erc721MortgageToken.foreclose(1))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.2.10.3. foreclose unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken } = fixture;

            await expect(erc721MortgageToken.foreclose(0))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");

            await expect(erc721MortgageToken.foreclose(3))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidMortgageId");
        });

        it('3.2.10.4. foreclose unsuccessfully when mortgage is not overdue', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await expect(erc721MortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidForeclosing");
        });

        it('3.2.10.5. foreclose unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken } = fixture;

            await expect(erc721MortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidForeclosing");
        });

        it('3.2.10.6. foreclose unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await callTransaction(erc721MortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            const due = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await expect(erc721MortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidForeclosing");
        });

        it('3.2.10.7. foreclose unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, lender1 } = fixture;

            const due = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(erc721MortgageToken.connect(lender1).foreclose(1));

            await expect(erc721MortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidForeclosing");
        });

        it('3.2.10.8. foreclose unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await callTransaction(erc721MortgageToken.connect(borrower1).cancel(1));

            await expect(erc721MortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(erc721MortgageToken, "InvalidForeclosing");
        });
    });

    describe('3.2.11. royaltyInfo(uint256, uint256)', () => {
        it('3.2.11.1. return correct royalty info for collection supporting ERC2981', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, feeReceiver, feeReceiverCollection, otherCollection } = fixture;

            const salePrice = ethers.BigNumber.from(1e6);
            
            const royaltyInfo1 = await erc721MortgageToken.royaltyInfo(1, salePrice);
            const royaltyFee1 = (await feeReceiverCollection.getRoyaltyRate(1, salePrice)).value;
            expect(royaltyInfo1[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo1[1]).to.equal(royaltyFee1);

            const royaltyInfo2 = await erc721MortgageToken.royaltyInfo(2, salePrice);
            const royaltyFee2 = (await otherCollection.getRoyaltyRate(2, salePrice)).value;
            expect(royaltyInfo2[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo2[1]).to.equal(royaltyFee2);
        });

        it('3.2.11.2. return zero for collection not supporting ERC2981', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
            });

            const { erc721MortgageToken, borrower1, admin, admins, lender1 } = fixture;

            const CollectionFactory = await ethers.getContractFactory("Collection");
            const collection = await upgrades.deployProxy(CollectionFactory, ["TestCollection", "TC"]);

            await callTransaction(collection.mint(borrower1.address, 1));
            await callTransaction(collection.connect(borrower1).setApprovalForAll(erc721MortgageToken.address, true));

            await callERC721MortgageToken_RegisterCollaterals(
                erc721MortgageToken,
                admins,
                [collection.address],
                true,
                await admin.nonce(),
            )

            await callTransaction(getERC721BorrowTx(erc721MortgageToken, borrower1, {
                token: collection.address,
                tokenId: BigNumber.from(1),
                principal: BigNumber.from(10e5),
                repayment: BigNumber.from(11e5),
                currency: ethers.constants.AddressZero,
                duration: BigNumber.from(1000),
            }));

            await callTransaction(erc721MortgageToken.connect(lender1).lend(
                1,
                { value: 1e9 }
            ));

            const royaltyInfo = await erc721MortgageToken.royaltyInfo(1, ethers.BigNumber.from(1e6));
            expect(royaltyInfo[0]).to.equal(ethers.constants.AddressZero);
            expect(royaltyInfo[1]).to.equal(0);
        });

        it('3.2.11.3. revert with invalid token id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleMortgage: true,
            });
            const { erc721MortgageToken } = fixture;

            const salePrice = ethers.utils.parseEther('10');

            await expect(erc721MortgageToken.royaltyInfo(0, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
            await expect(erc721MortgageToken.royaltyInfo(100, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");

            await expect(erc721MortgageToken.royaltyInfo(1, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
            await expect(erc721MortgageToken.royaltyInfo(2, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe('3.2.13. supportsInterface(bytes4)', () => {
        it('3.2.13.1. return true for appropriate interface', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            const { erc721MortgageToken } = fixture;

            const ICommon = ICommon__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
            const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();
            const IERC721MetadataUpgradeable = IERC721MetadataUpgradeable__factory.createInterface();
            const IERC4906Upgradeable = IERC4906Upgradeable__factory.createInterface();
            const IMortgageToken = IMortgageToken__factory.createInterface();

            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);
            const IERC721MetadataUpgradeableInterfaceId = getInterfaceID(IERC721MetadataUpgradeable, [IERC721Upgradeable]);
            const IMortgageTokenInterfaceId = getInterfaceID(IMortgageToken, [ICommon, IERC721MetadataUpgradeable, IERC2981Upgradeable, IERC4906Upgradeable]);

            expect(await erc721MortgageToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await erc721MortgageToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))).to.equal(true);
            expect(await erc721MortgageToken.supportsInterface(getBytes4Hex(IMortgageTokenInterfaceId))).to.equal(true);
        });
    });
});
