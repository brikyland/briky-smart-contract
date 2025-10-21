import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import { Constant } from '@tests/test.constant';
import {
    IERC165UpgradeableInterfaceId,
    IERC721MetadataUpgradeableInterfaceId,
    IERC721UpgradeableInterfaceId,
    IERC2981UpgradeableInterfaceId,
    IERC4906UpgradeableInterfaceId,
} from '@tests/interfaces';

// @tests/lucra
import { Initialization } from '@tests/lucra/test.initialization';

// @typechain-types
import { Admin, PromotionToken, Currency } from '@typechain-types';

// @utils
import { callTransaction, getSignatures, randomWallet } from '@utils/blockchain';
import { getBytes4Hex, structToObject } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPromotionToken } from '@utils/deployments/lucra/promotionToken';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';

// @utils/models/lucra
import {
    CancelContentsParams,
    CancelContentsParamsInput,
    CreateContentsParams,
    CreateContentsParamsInput,
    UpdateContentURIsParams,
    UpdateContentURIsParamsInput,
    UpdateFeeParams,
    UpdateFeeParamsInput,
    UpdateRoyaltyRateParams,
    UpdateRoyaltyRateParamsInput,
    WithdrawParams,
    WithdrawParamsInput,
} from '@utils/models/lucra/promotionToken';

// @utils/signatures/lucra
import {
    getCancelContentsSignatures,
    getCreateContentsSignatures,
    getUpdateContentURIsSignatures,
    getUpdateFeeSignatures,
    getUpdateRoyaltyRateSignatures,
    getWithdrawSignatures,
} from '@utils/signatures/lucra/promotionToken';

// @utils/transaction/common
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/lucra
import {
    getPromotionTokenTx_CancelContents,
    getPromotionTokenTx_CreateContents,
    getPromotionTokenTx_Mint,
    getPromotionTokenTx_UpdateContentURIs,
    getPromotionTokenTx_UpdateFee,
    getPromotionTokenTx_UpdateRoyaltyRate,
    getPromotionTokenTx_Withdraw,
    getPromotionTokenTxByInput_CancelContents,
    getPromotionTokenTxByInput_CreateContents,
    getPromotionTokenTxByInput_UpdateContentURIs,
    getPromotionTokenTxByInput_UpdateFee,
    getPromotionTokenTxByInput_UpdateRoyaltyRate,
    getPromotionTokenTxByInput_Withdraw,
} from '@utils/transaction/lucra/promotionToken';

interface PromotionTokenFixture {
    admin: Admin;
    promotionToken: PromotionToken;
    currency1: Currency;
    currency2: Currency;

    deployer: any;
    admins: any[];
    minter1: any;
    minter2: any;
    minter3: any;
}

describe('5.2. PromotionToken', async () => {
    async function promotionTokenFixture(): Promise<PromotionTokenFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, minter1, minter2, minter3] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const promotionToken = (await deployPromotionToken(
            deployer.address,
            admin.address,
            Initialization.PROMOTION_TOKEN_Name,
            Initialization.PROMOTION_TOKEN_Symbol,
            Initialization.PROMOTION_TOKEN_Fee,
            Initialization.PROMOTION_TOKEN_RoyaltyRate
        )) as PromotionToken;

        const currency1 = (await deployCurrency(deployer, 'MockCurrency1', 'MCK1')) as Currency;
        const currency2 = (await deployCurrency(deployer, 'MockCurrency2', 'MCK2')) as Currency;

        return {
            admin,
            promotionToken,
            deployer,
            admins,
            minter1,
            minter2,
            minter3,
            currency1,
            currency2,
        };
    }

    async function beforePromotionTokenTest({
        listSampleContents = false,
        pause = false,
    } = {}): Promise<PromotionTokenFixture> {
        const fixture = await loadFixture(promotionTokenFixture);
        const { deployer, promotionToken, admin, admins } = fixture;

        let currentTimestamp = await time.latest();

        if (listSampleContents) {
            await getPromotionTokenTxByInput_CreateContents(
                promotionToken,
                deployer,
                {
                    uris: ['testing_uri_1', 'testing_uri_2', 'testing_uri_3'],
                    startAts: [currentTimestamp + 100, currentTimestamp + 400, currentTimestamp + 800],
                    durations: [200, 1600, 3200],
                },
                admin,
                admins
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(promotionToken, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('5.2.1. initialize(address,string,string,uint256,uint256)', async () => {
        it('5.2.1.1. Deploy successfully', async () => {
            const { admin, promotionToken } = await beforePromotionTokenTest();

            expect(await promotionToken.admin()).to.equal(admin.address);

            expect(await promotionToken.name()).to.equal(Initialization.PROMOTION_TOKEN_Name);
            expect(await promotionToken.symbol()).to.equal(Initialization.PROMOTION_TOKEN_Symbol);

            expect(await promotionToken.tokenNumber()).to.equal(0);
            expect(await promotionToken.contentNumber()).to.equal(0);

            const fee = await promotionToken.fee();
            expect(fee).to.equal(Initialization.PROMOTION_TOKEN_Fee);

            const royaltyRate = await promotionToken.getRoyaltyRate(0);
            expect(royaltyRate.value).to.equal(Initialization.PROMOTION_TOKEN_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const tx = promotionToken.deployTransaction;
            await expect(tx).to.emit(promotionToken, 'FeeUpdate').withArgs(Initialization.PROMOTION_TOKEN_Fee);
            await expect(tx)
                .to.emit(promotionToken, 'RoyaltyRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: Initialization.PROMOTION_TOKEN_RoyaltyRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });
        });

        it('5.2.1.2. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin } = await beforePromotionTokenTest();

            const PromotionToken = await ethers.getContractFactory('PromotionToken', deployer);

            await expect(
                upgrades.deployProxy(PromotionToken, [
                    admin.address,
                    Initialization.PROMOTION_TOKEN_Name,
                    Initialization.PROMOTION_TOKEN_Symbol,
                    Initialization.PROMOTION_TOKEN_Fee,
                    Constant.COMMON_RATE_MAX_FRACTION.add(1),
                ])
            ).to.be.reverted;
        });
    });

    /* --- Administration --- */
    describe('5.2.2. updateFee(uint256,bytes[])', async () => {
        it('5.2.2.1. Update fee successfully', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest();

            const fee = await promotionToken.fee();
            const newFee = fee.add(ethers.utils.parseEther('1'));

            const paramsInput: UpdateFeeParamsInput = {
                fee: newFee,
            };
            const tx = await getPromotionTokenTxByInput_UpdateFee(promotionToken, deployer, paramsInput, admin, admins);
            await expect(tx).to.emit(promotionToken, 'FeeUpdate').withArgs(newFee);

            expect(await promotionToken.fee()).to.equal(newFee);
        });

        it('5.2.2.2. Update fee unsuccessfully with invalid signature', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest();

            const fee = await promotionToken.fee();
            const newFee = fee.add(ethers.utils.parseEther('1'));

            const paramsInput: UpdateFeeParamsInput = {
                fee: newFee,
            };
            const params: UpdateFeeParams = {
                ...paramsInput,
                signatures: await getUpdateFeeSignatures(promotionToken, paramsInput, admin, admins, false),
            };
            await expect(getPromotionTokenTx_UpdateFee(promotionToken, deployer, params)).to.be.revertedWithCustomError(
                promotionToken,
                'FailedVerification'
            );
        });
    });

    describe('5.2.3. updateRoyaltyRate(uint256,bytes[])', async () => {
        it('5.2.3.1. Update royalty rate successfully with valid signatures', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest();

            const paramsInput: UpdateRoyaltyRateParamsInput = {
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const tx = await getPromotionTokenTxByInput_UpdateRoyaltyRate(
                promotionToken,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx)
                .to.emit(promotionToken, 'RoyaltyRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: ethers.utils.parseEther('0.2'),
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            const royaltyRate = await promotionToken.getRoyaltyRate(0);
            expect(royaltyRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('5.2.3.2. Update royalty rate unsuccessfully with invalid signatures', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest();

            const paramsInput: UpdateRoyaltyRateParamsInput = {
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const params: UpdateRoyaltyRateParams = {
                ...paramsInput,
                signatures: await getUpdateRoyaltyRateSignatures(promotionToken, paramsInput, admin, admins, false),
            };
            await expect(
                getPromotionTokenTx_UpdateRoyaltyRate(promotionToken, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('5.2.3.3. Update royalty rate unsuccessfully with invalid rate', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest();

            await expect(
                getPromotionTokenTxByInput_UpdateRoyaltyRate(
                    promotionToken,
                    deployer,
                    {
                        royaltyRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(promotionToken, 'InvalidRate');
        });
    });

    describe('5.2.4. withdraw(address,address[],uint256[],bytes[])', async () => {
        it('5.2.4.1. Withdraw native tokens successfully', async () => {
            const { deployer, admins, admin, promotionToken } = await beforePromotionTokenTest();

            const receiver = randomWallet();

            await callTransaction(
                deployer.sendTransaction({
                    to: promotionToken.address,
                    value: 2000,
                })
            );

            let balance = await ethers.provider.getBalance(promotionToken.address);
            expect(balance).to.equal(2000);

            const paramsInput1: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(1200)],
            };
            const tx1 = await getPromotionTokenTxByInput_Withdraw(
                promotionToken,
                deployer,
                paramsInput1,
                admin,
                admins
            );
            await tx1.wait();

            balance = await ethers.provider.getBalance(promotionToken.address);
            expect(balance).to.equal(800);

            balance = await ethers.provider.getBalance(receiver.address);
            expect(balance).to.equal(1200);

            await callTransaction(
                deployer.sendTransaction({
                    to: promotionToken.address,
                    value: 3000,
                })
            );

            balance = await ethers.provider.getBalance(promotionToken.address);
            expect(balance).to.equal(3800);

            const paramsInput2: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(3800)],
            };
            const tx2 = await getPromotionTokenTxByInput_Withdraw(
                promotionToken,
                deployer,
                paramsInput2,
                admin,
                admins
            );
            await tx2.wait();

            balance = await ethers.provider.getBalance(promotionToken.address);
            expect(balance).to.equal(0);

            balance = await ethers.provider.getBalance(receiver.address);
            expect(balance).to.equal(5000);
        });

        it('5.2.4.2. Withdraw ERC-20 tokens successfully', async () => {
            const { deployer, admins, admin, promotionToken, currency1, currency2 } = await beforePromotionTokenTest();

            const receiver = randomWallet();

            await callTransaction(currency1.mint(promotionToken.address, 1000));
            await callTransaction(currency2.mint(promotionToken.address, ethers.constants.MaxUint256));

            expect(await currency1.balanceOf(promotionToken.address)).to.equal(1000);
            expect(await currency2.balanceOf(promotionToken.address)).to.equal(ethers.constants.MaxUint256);
            expect(await currency1.balanceOf(receiver.address)).to.equal(0);
            expect(await currency2.balanceOf(receiver.address)).to.equal(0);

            const paramsInput: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [currency1.address, currency2.address],
                values: [BigNumber.from(700), ethers.constants.MaxUint256],
            };
            const tx = await getPromotionTokenTxByInput_Withdraw(promotionToken, deployer, paramsInput, admin, admins);
            await tx.wait();

            expect(await currency1.balanceOf(promotionToken.address)).to.equal(300);
            expect(await currency2.balanceOf(promotionToken.address)).to.equal(0);
            expect(await currency1.balanceOf(receiver.address)).to.equal(700);
            expect(await currency2.balanceOf(receiver.address)).to.equal(ethers.constants.MaxUint256);
        });

        it('5.2.4.3. Withdraw token successfully multiple times in the same tx', async () => {
            const { deployer, admins, admin, promotionToken, currency1, currency2 } = await beforePromotionTokenTest();

            const receiver = randomWallet();

            await callTransaction(
                deployer.sendTransaction({
                    to: promotionToken.address,
                    value: 2000,
                })
            );

            await callTransaction(currency1.mint(promotionToken.address, 1000));
            await callTransaction(currency2.mint(promotionToken.address, ethers.constants.MaxUint256));

            expect(await currency1.balanceOf(promotionToken.address)).to.equal(1000);
            expect(await currency2.balanceOf(promotionToken.address)).to.equal(ethers.constants.MaxUint256);
            expect(await currency1.balanceOf(receiver.address)).to.equal(0);
            expect(await currency2.balanceOf(receiver.address)).to.equal(0);

            const paramsInput: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    currency1.address,
                    currency2.address,
                ],
                values: [BigNumber.from(100), BigNumber.from(200), BigNumber.from(400), BigNumber.from(800)],
            };
            const tx = await getPromotionTokenTxByInput_Withdraw(promotionToken, deployer, paramsInput, admin, admins);
            await tx.wait();

            expect(await ethers.provider.getBalance(promotionToken.address)).to.equal(1700);
            expect(await ethers.provider.getBalance(receiver.address)).to.equal(300);

            expect(await currency1.balanceOf(promotionToken.address)).to.equal(600);
            expect(await currency1.balanceOf(receiver.address)).to.equal(400);
            expect(await currency2.balanceOf(promotionToken.address)).to.equal(ethers.constants.MaxUint256.sub(800));
            expect(await currency2.balanceOf(receiver.address)).to.equal(800);
        });

        it('5.2.4.4. Withdraw unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, promotionToken } = await beforePromotionTokenTest();

            const paramsInput: WithdrawParamsInput = {
                receiver: deployer.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(1000)],
            };
            const params: WithdrawParams = {
                ...paramsInput,
                signatures: await getWithdrawSignatures(promotionToken, paramsInput, admin, admins, false),
            };
            await expect(getPromotionTokenTx_Withdraw(promotionToken, deployer, params)).to.be.revertedWithCustomError(
                promotionToken,
                'FailedVerification'
            );
        });

        it('5.2.4.5. Withdraw unsuccessfully with insufficient native tokens', async () => {
            const { deployer, admins, admin, promotionToken } = await beforePromotionTokenTest();

            await expect(
                getPromotionTokenTxByInput_Withdraw(
                    promotionToken,
                    deployer,
                    {
                        receiver: deployer.address,
                        currencies: [ethers.constants.AddressZero],
                        values: [BigNumber.from(1000)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(promotionToken, 'FailedTransfer');
        });

        it('5.2.4.6. Withdraw unsuccessfully with insufficient ERC20 tokens', async () => {
            const { deployer, admins, admin, promotionToken, currency1 } = await beforePromotionTokenTest();

            await expect(
                getPromotionTokenTxByInput_Withdraw(
                    promotionToken,
                    deployer,
                    {
                        receiver: deployer.address,
                        currencies: [currency1.address],
                        values: [BigNumber.from(1000)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it('5.2.4.7. Withdraw unsuccessfully when transferring native token to withdrawer failed', async () => {
            const { deployer, admins, admin, promotionToken } = await beforePromotionTokenTest();

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(
                deployer.sendTransaction({
                    to: promotionToken.address,
                    value: 1000,
                })
            );

            await expect(
                getPromotionTokenTxByInput_Withdraw(
                    promotionToken,
                    deployer,
                    {
                        receiver: failReceiver.address,
                        currencies: [ethers.constants.AddressZero],
                        values: [BigNumber.from(1000)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(promotionToken, 'FailedTransfer');
        });

        it('5.2.4.8. Withdraw unsuccessfully when the contract is reentered', async () => {
            const { deployer, admins, admin, promotionToken } = await beforePromotionTokenTest();

            const reentrancyERC20 = await deployReentrancyERC20(deployer, true, false);

            await callTransaction(reentrancyERC20.mint(promotionToken.address, 1000));

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [promotionToken.address, 'withdraw', reentrancyERC20.address, [reentrancyERC20.address], [200]]
            );

            await callTransaction(
                reentrancyERC20.updateReentrancyPlan(
                    promotionToken.address,
                    promotionToken.interface.encodeFunctionData('withdraw', [
                        reentrancyERC20.address,
                        [reentrancyERC20.address],
                        [200],
                        await getSignatures(message, admins, (await admin.nonce()).add(1)),
                    ])
                )
            );

            await expect(
                reentrancyERC20.call(
                    promotionToken.address,
                    promotionToken.interface.encodeFunctionData('withdraw', [
                        reentrancyERC20.address,
                        [reentrancyERC20.address],
                        [200],
                        await getSignatures(message, admins, await admin.nonce()),
                    ])
                )
            ).to.be.revertedWith('ReentrancyGuard: reentrant call');

            const balance = await reentrancyERC20.balanceOf(promotionToken.address);
            expect(balance).to.equal(1000);
        });
    });

    describe('5.2.5. createContents(string[],uint40[],uint40[],bytes[])', async () => {
        it('5.2.5.1. Create contents successfully', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest();

            const currentTimestamp = await time.latest();

            const startAt1 = currentTimestamp + 100;
            const startAt2 = currentTimestamp + 400;
            const startAt3 = currentTimestamp + 800;
            const duration1 = 200;
            const duration2 = 1600;
            const duration3 = 3200;

            const paramsInput: CreateContentsParamsInput = {
                uris: ['testing_uri_1', 'testing_uri_2', 'testing_uri_3'],
                startAts: [startAt1, startAt2, startAt3],
                durations: [duration1, duration2, duration3],
            };
            const tx = await getPromotionTokenTxByInput_CreateContents(
                promotionToken,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            for (let i = 1; i <= 3; ++i) {
                await expect(tx)
                    .to.emit(promotionToken, 'NewContent')
                    .withArgs(i, paramsInput.uris[i - 1], paramsInput.startAts[i - 1], paramsInput.durations[i - 1]);
            }

            expect(await promotionToken.contentNumber()).to.equal(3);

            const content1 = await promotionToken.getContent(1);
            expect(content1.uri).to.equal(paramsInput.uris[0]);
            expect(content1.startAt).to.equal(paramsInput.startAts[0]);
            expect(content1.endAt).to.equal(paramsInput.startAts[0] + paramsInput.durations[0]);

            const content2 = await promotionToken.getContent(2);
            expect(content2.uri).to.equal(paramsInput.uris[1]);
            expect(content2.startAt).to.equal(paramsInput.startAts[1]);
            expect(content2.endAt).to.equal(paramsInput.startAts[1] + paramsInput.durations[1]);

            const content3 = await promotionToken.getContent(3);
            expect(content3.uri).to.equal(paramsInput.uris[2]);
            expect(content3.startAt).to.equal(paramsInput.startAts[2]);
            expect(content3.endAt).to.equal(paramsInput.startAts[2] + paramsInput.durations[2]);
        });

        it('5.2.5.2. Create contents unsuccessfully with invalid signatures', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest();

            const currentTimestamp = await time.latest();

            const startAt1 = currentTimestamp + 100;
            const startAt2 = currentTimestamp + 400;
            const startAt3 = currentTimestamp + 800;
            const duration1 = 200;
            const duration2 = 1600;
            const duration3 = 3200;

            const paramsInput: CreateContentsParamsInput = {
                uris: ['testing_uri_1', 'testing_uri_2', 'testing_uri_3'],
                startAts: [startAt1, startAt2, startAt3],
                durations: [duration1, duration2, duration3],
            };
            const params: CreateContentsParams = {
                ...paramsInput,
                signatures: await getCreateContentsSignatures(promotionToken, paramsInput, admin, admins, false),
            };
            await expect(
                getPromotionTokenTx_CreateContents(promotionToken, deployer, params)
            ).to.be.revertedWithCustomError(promotionToken, 'FailedVerification');
        });

        async function testRevert(
            fixture: PromotionTokenFixture,
            uris: string[],
            startAts: number[],
            durations: number[],
            customError: string
        ) {
            const { deployer, promotionToken, admin, admins } = fixture;

            await expect(
                getPromotionTokenTxByInput_CreateContents(
                    promotionToken,
                    deployer,
                    {
                        uris: uris,
                        startAts: startAts,
                        durations: durations,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(promotionToken, customError);
        }

        it('5.2.5.3. Create contents unsuccessfully with invalid input', async () => {
            const fixture = await beforePromotionTokenTest();

            const currentTimestamp = await time.latest();

            const startAt1 = currentTimestamp + 100;
            const startAt2 = currentTimestamp + 400;
            const startAt3 = currentTimestamp + 800;
            const duration1 = 200;
            const duration2 = 1600;
            const duration3 = 3200;

            const uris = ['testing_uri_1', 'testing_uri_2', 'testing_uri_3'];
            const startAts = [startAt1, startAt2, startAt3];
            const durations = [duration1, duration2, duration3];

            await testRevert(fixture, uris.slice(0, 2), startAts, durations, 'InvalidInput');
            await testRevert(fixture, uris, startAts.slice(0, 2), durations, 'InvalidInput');
            await testRevert(fixture, uris, startAts, durations.slice(0, 2), 'InvalidInput');
        });

        it('5.2.5.4. Create contents unsuccessfully when it start before block.timestamp', async () => {
            const fixture = await beforePromotionTokenTest();

            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const startAt1 = timestamp - 1;
            const duration1 = 200;

            const uris = ['testing_uri_1'];
            const startAts = [startAt1];
            const durations = [duration1];

            await testRevert(fixture, uris, startAts, durations, 'InvalidTimestamp');
        });
    });

    describe('5.2.6. updateContentURIs(uint256[],string[],bytes[])', async () => {
        it('5.2.6.1. Update content uris successfully', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const paramsInput: UpdateContentURIsParamsInput = {
                contentIds: [BigNumber.from(1), BigNumber.from(2)],
                uris: ['testing_uri_1_updated', 'testing_uri_2_updated'],
            };
            const tx = await getPromotionTokenTxByInput_UpdateContentURIs(
                promotionToken,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            for (let i = 1; i <= 2; ++i) {
                await expect(tx)
                    .to.emit(promotionToken, 'ContentURIUpdate')
                    .withArgs(paramsInput.contentIds[i - 1], paramsInput.uris[i - 1]);
            }

            expect((await promotionToken.getContent(1)).uri).to.equal('testing_uri_1_updated');
            expect((await promotionToken.getContent(2)).uri).to.equal('testing_uri_2_updated');
            expect((await promotionToken.getContent(3)).uri).to.equal('testing_uri_3');
        });

        it('5.2.6.2. Update content uris unsuccessfully with invalid signatures', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const contentIds = [BigNumber.from(1), BigNumber.from(2)];
            const uris = ['testing_uri_1_updated', 'testing_uri_2_updated'];

            const paramsInput: UpdateContentURIsParamsInput = {
                contentIds: contentIds,
                uris: uris,
            };
            const params: UpdateContentURIsParams = {
                ...paramsInput,
                signatures: await getUpdateContentURIsSignatures(promotionToken, paramsInput, admin, admins, false),
            };
            await expect(
                getPromotionTokenTx_UpdateContentURIs(promotionToken, deployer, params)
            ).to.be.revertedWithCustomError(promotionToken, 'FailedVerification');
        });

        async function testRevert(
            fixture: PromotionTokenFixture,
            contentIds: BigNumber[],
            uris: string[],
            customError: string
        ) {
            const { deployer, promotionToken, admin, admins } = fixture;

            await expect(
                getPromotionTokenTxByInput_UpdateContentURIs(
                    promotionToken,
                    deployer,
                    {
                        contentIds: contentIds,
                        uris: uris,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(promotionToken, customError);
        }

        it('5.2.6.3. Update content uris unsuccessfully with invalid input', async () => {
            const fixture = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const contentIds = [BigNumber.from(1), BigNumber.from(2), BigNumber.from(3)];
            const uris = ['testing_uri_1_updated', 'testing_uri_2_updated'];

            await testRevert(fixture, contentIds, uris, 'InvalidInput');
        });

        it('5.2.6.4. Update content uris unsuccessfully with invalid content id', async () => {
            const fixture = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const contentIds = [BigNumber.from(1), BigNumber.from(0)];
            const uris = ['testing_uri_1_updated', 'testing_uri_2_updated'];

            await testRevert(fixture, contentIds, uris, 'InvalidContentId');
        });

        it('5.2.6.5. Update content uris unsuccessfully with already started content', async () => {
            const fixture = await beforePromotionTokenTest({
                listSampleContents: true,
            });
            const { promotionToken } = fixture;

            const contentIds = [BigNumber.from(1)];
            const uris = ['testing_uri_1_updated'];

            const startAt = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt);

            await testRevert(fixture, contentIds, uris, 'AlreadyStarted');
        });
    });

    describe('5.2.7. cancelContents(uint256,bytes[])', async () => {
        it('5.2.7.1. Cancel contents successfully', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            const startAt2 = (await promotionToken.getContent(2)).startAt;
            const startAt3 = (await promotionToken.getContent(3)).startAt;
            const endAt1 = (await promotionToken.getContent(1)).endAt;

            const cancelAt = startAt1 + 50;
            // assuming startAt1 < cancelAt < endAt1 < startAt2 < startAt3 < endAt2 < endAt3

            await time.setNextBlockTimestamp(cancelAt);

            const paramsInput: CancelContentsParamsInput = {
                contentIds: [BigNumber.from(2), BigNumber.from(3)],
            };
            const tx = await getPromotionTokenTxByInput_CancelContents(
                promotionToken,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx)
                .to.emit(promotionToken, 'ContentCancellation')
                .withArgs(2)
                .emit(promotionToken, 'ContentCancellation')
                .withArgs(3);

            expect(await promotionToken.contentNumber()).to.equal(3);

            const content1 = await promotionToken.getContent(1);
            expect(content1.uri).to.equal('testing_uri_1');
            expect(content1.startAt).to.equal(startAt1);
            expect(content1.endAt).to.equal(endAt1);

            const content2 = await promotionToken.getContent(2);
            expect(content2.uri).to.equal('testing_uri_2');
            expect(content2.startAt).to.equal(startAt2);
            expect(content2.endAt).to.equal(cancelAt);

            const content3 = await promotionToken.getContent(3);
            expect(content3.uri).to.equal('testing_uri_3');
            expect(content3.startAt).to.equal(startAt3);
            expect(content3.endAt).to.equal(cancelAt);
        });

        it('5.2.7.2. Cancel contents unsuccessfully with invalid signatures', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const cancelAt = (await promotionToken.getContent(1)).startAt + 50;
            await time.setNextBlockTimestamp(cancelAt);

            const paramsInput: CancelContentsParamsInput = {
                contentIds: [BigNumber.from(2), BigNumber.from(3)],
            };
            const params: CancelContentsParams = {
                ...paramsInput,
                signatures: await getCancelContentsSignatures(promotionToken, paramsInput, admin, admins, false),
            };
            await expect(
                getPromotionTokenTx_CancelContents(promotionToken, deployer, params)
            ).to.be.revertedWithCustomError(promotionToken, 'FailedVerification');
        });

        it('5.2.7.3. Revert with invalid content id', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const cancelAt = (await promotionToken.getContent(1)).startAt + 50;
            await time.setNextBlockTimestamp(cancelAt);

            await expect(
                getPromotionTokenTxByInput_CancelContents(
                    promotionToken,
                    deployer,
                    {
                        contentIds: [BigNumber.from(2), BigNumber.from(3), BigNumber.from(0)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(promotionToken, 'InvalidContentId');
        });

        it('5.2.7.4. Cancel contents unsuccessfully with started events', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const cancelAt = (await promotionToken.getContent(1)).startAt + 50;
            await time.setNextBlockTimestamp(cancelAt);

            await expect(
                getPromotionTokenTxByInput_CancelContents(
                    promotionToken,
                    deployer,
                    {
                        contentIds: [BigNumber.from(1)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(promotionToken, 'AlreadyStarted');
        });

        it('5.2.7.5. Cancel contents successfully with already cancelled content', async () => {
            const { deployer, promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const cancelAt = (await promotionToken.getContent(1)).startAt + 50;
            await time.setNextBlockTimestamp(cancelAt);

            await callTransaction(
                getPromotionTokenTxByInput_CancelContents(
                    promotionToken,
                    deployer,
                    {
                        contentIds: [BigNumber.from(2), BigNumber.from(3)],
                    },
                    admin,
                    admins
                )
            );

            await expect(
                getPromotionTokenTxByInput_CancelContents(
                    promotionToken,
                    deployer,
                    {
                        contentIds: [BigNumber.from(3)],
                    },
                    admin,
                    admins
                )
            ).to.be.not.reverted;
        });
    });

    /* --- Query --- */
    describe('5.2.8. getContent(uint256)', async () => {
        it('5.2.8.1. Return successfully with valid content id', async () => {
            const { promotionToken } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            await expect(promotionToken.getContent(1)).to.not.be.reverted;
            await expect(promotionToken.getContent(2)).to.not.be.reverted;
            await expect(promotionToken.getContent(3)).to.not.be.reverted;
        });

        it('5.2.8.2. Revert with invalid content id', async () => {
            const { promotionToken } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            await expect(promotionToken.getContent(0)).to.be.revertedWithCustomError(
                promotionToken,
                'InvalidContentId'
            );
            await expect(promotionToken.getContent(10)).to.be.revertedWithCustomError(
                promotionToken,
                'InvalidContentId'
            );
        });
    });

    describe('5.2.9. supportsInterface(bytes4)', async () => {
        it('5.2.9.1. Return true for appropriate interface', async () => {
            const { promotionToken } = await beforePromotionTokenTest();

            expect(await promotionToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await promotionToken.supportsInterface(getBytes4Hex(IERC721UpgradeableInterfaceId))).to.equal(true);
            expect(
                await promotionToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))
            ).to.equal(true);
            expect(await promotionToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await promotionToken.supportsInterface(getBytes4Hex(IERC4906UpgradeableInterfaceId))).to.equal(true);
        });
    });

    /* --- Command --- */
    describe('5.2.10. mint(uint256,uint256)', async () => {
        it('5.2.10.1. Mint successfully', async () => {
            const { promotionToken, minter1, minter2 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const fee = await promotionToken.fee();

            const initMinter1Balance = await ethers.provider.getBalance(minter1.address);
            const initMinter2Balance = await ethers.provider.getBalance(minter2.address);
            const initPromotionTokenBalance = await ethers.provider.getBalance(promotionToken.address);

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            // Mint 5 tokens with just enough value
            const amount1 = 2;
            let tokenIdStart = (await promotionToken.tokenNumber()).add(1);
            let tokenIdEnd = tokenIdStart.add(amount1).sub(1);

            const tx1 = await getPromotionTokenTx_Mint(
                promotionToken,
                minter1,
                {
                    contentId: BigNumber.from(1),
                    amount: BigNumber.from(amount1),
                },
                { value: fee.mul(amount1) }
            );
            const receipt1 = await tx1.wait();

            for (let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                await expect(tx1).to.emit(promotionToken, 'NewToken').withArgs(i, 1, minter1.address);
            }

            expect(await promotionToken.tokenNumber()).to.equal(tokenIdEnd);
            expect(await promotionToken.balanceOf(minter1.address)).to.equal(amount1);
            for (let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                const contentURI = (await promotionToken.getContent(1)).uri;
                expect(await promotionToken.ownerOf(i)).to.equal(minter1.address);
                expect(await promotionToken.tokenURI(i)).to.equal(contentURI);
            }
            expect(await promotionToken.mintCounts(minter1.address, 1)).to.equal(amount1);

            const tx1GasFee = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter1.address)).to.equal(
                initMinter1Balance.sub(tx1GasFee).sub(fee.mul(amount1))
            );
            expect(await ethers.provider.getBalance(promotionToken.address)).to.equal(
                initPromotionTokenBalance.add(fee.mul(amount1))
            );

            // Refund when minting with more value than needed

            const minter1BalanceAfterTx1 = await ethers.provider.getBalance(minter1.address);
            const amount2 = 4;
            tokenIdStart = (await promotionToken.tokenNumber()).add(1);
            tokenIdEnd = tokenIdStart.add(amount2).sub(1);

            const tx2 = await getPromotionTokenTx_Mint(
                promotionToken,
                minter1,
                {
                    contentId: BigNumber.from(1),
                    amount: BigNumber.from(amount2),
                },
                { value: fee.mul(amount2).add(ethers.utils.parseEther('1')) }
            );
            const receipt2 = await tx2.wait();

            for (let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                await expect(tx2).to.emit(promotionToken, 'NewToken').withArgs(i, 1, minter1.address);
            }

            expect(await promotionToken.tokenNumber()).to.equal(tokenIdEnd);
            expect(await promotionToken.balanceOf(minter1.address)).to.equal(amount1 + amount2);
            for (let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                const contentURI = (await promotionToken.getContent(1)).uri;
                expect(await promotionToken.ownerOf(i)).to.equal(minter1.address);
                expect(await promotionToken.tokenURI(i)).to.equal(contentURI);
            }
            expect(await promotionToken.mintCounts(minter1.address, 1)).to.equal(amount1 + amount2);

            const tx2GasFee = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter1.address)).to.equal(
                minter1BalanceAfterTx1.sub(tx2GasFee).sub(fee.mul(amount2))
            );
            expect(await ethers.provider.getBalance(promotionToken.address)).to.equal(
                initPromotionTokenBalance.add(fee.mul(amount1 + amount2))
            );

            // Another minter with another content
            const startAt2 = (await promotionToken.getContent(2)).startAt;
            await time.setNextBlockTimestamp(startAt2);

            const amount3 = 8;
            tokenIdStart = (await promotionToken.tokenNumber()).add(1);
            tokenIdEnd = tokenIdStart.add(amount3).sub(1);

            const tx3 = await getPromotionTokenTx_Mint(
                promotionToken,
                minter2,
                {
                    contentId: BigNumber.from(2),
                    amount: BigNumber.from(amount3),
                },
                { value: fee.mul(amount3) }
            );
            const receipt3 = await tx3.wait();

            for (let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                await expect(tx3).to.emit(promotionToken, 'NewToken').withArgs(i, 2, minter2.address);
            }

            expect(await promotionToken.tokenNumber()).to.equal(tokenIdEnd);
            expect(await promotionToken.balanceOf(minter2.address)).to.equal(amount3);
            for (let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                const contentURI = (await promotionToken.getContent(2)).uri;
                expect(await promotionToken.ownerOf(i)).to.equal(minter2.address);
                expect(await promotionToken.tokenURI(i)).to.equal(contentURI);
            }
            expect(await promotionToken.mintCounts(minter2.address, 2)).to.equal(amount3);

            const tx3GasFee = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter2.address)).to.equal(
                initMinter2Balance.sub(tx3GasFee).sub(fee.mul(amount3))
            );
            expect(await ethers.provider.getBalance(promotionToken.address)).to.equal(
                initPromotionTokenBalance.add(fee.mul(amount1 + amount2 + amount3))
            );
        });

        it('5.2.10.2. Mint successfully when paused', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
                pause: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            const fee = await promotionToken.fee();
            await expect(
                getPromotionTokenTx_Mint(
                    promotionToken,
                    minter1,
                    { contentId: BigNumber.from(1), amount: BigNumber.from(1) },
                    { value: fee }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('5.2.10.3. Mint unsuccessfully with invalid amount', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            await expect(
                getPromotionTokenTx_Mint(promotionToken, minter1, {
                    contentId: BigNumber.from(1),
                    amount: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(promotionToken, 'InvalidInput');
        });

        it('5.2.10.4. Mint unsuccessfully with invalid content id', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            const fee = await promotionToken.fee();
            await expect(
                getPromotionTokenTx_Mint(
                    promotionToken,
                    minter1,
                    { contentId: BigNumber.from(0), amount: BigNumber.from(1) },
                    { value: fee }
                )
            ).to.be.revertedWithCustomError(promotionToken, 'InvalidContentId');

            await expect(
                getPromotionTokenTx_Mint(
                    promotionToken,
                    minter1,
                    {
                        contentId: BigNumber.from(100),
                        amount: BigNumber.from(1),
                    },
                    { value: fee }
                )
            ).to.be.revertedWithCustomError(promotionToken, 'InvalidContentId');
        });

        it('5.2.10.5. Mint unsuccessfully with unopened content', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1 - 1);

            await expect(
                getPromotionTokenTx_Mint(promotionToken, minter1, {
                    contentId: BigNumber.from(1),
                    amount: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(promotionToken, 'NotOpened');
        });

        it('5.2.10.6. Mint unsuccessfully with ended content', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const endAt1 = (await promotionToken.getContent(1)).endAt;
            await time.setNextBlockTimestamp(endAt1 + 1);

            await expect(
                getPromotionTokenTx_Mint(promotionToken, minter1, {
                    contentId: BigNumber.from(1),
                    amount: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(promotionToken, 'AlreadyEnded');
        });

        it('5.2.10.7. Mint unsuccessfully with insufficient value', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            await expect(
                getPromotionTokenTx_Mint(promotionToken, minter1, {
                    contentId: BigNumber.from(1),
                    amount: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(promotionToken, 'InsufficientValue');
        });
    });
});
