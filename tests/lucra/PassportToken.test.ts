import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    PassportToken,
    Currency,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    IERC721Upgradeable__factory,
    IERC4906Upgradeable__factory,
    IERC721MetadataUpgradeable__factory,
    IRoyaltyRateProposer__factory,
    ICommon__factory,
} from '@typechain-types';
import { callTransaction, getSignatures, randomWallet, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployPassportToken } from '@utils/deployments/lucra/passportToken';
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { Contract } from 'ethers';
import { getBytes4Hex, getInterfaceID, structToObject } from '@utils/utils';
import { Initialization } from './test.initialization';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancyERC20 } from '@utils/deployments/mock/mockReentrancy/reentrancyERC20';
import { Rate } from '@utils/models/Common';
import { callPausable_Pause } from '@utils/callWithSignatures/Pausable';

interface PassportTokenFixture {
    admin: Admin;
    passportToken: PassportToken;
    currency1: Currency;
    currency2: Currency;

    deployer: any;
    admins: any[];
    minter1: any;
    minter2: any;
    minter3: any;
}

async function testReentrancy_passportToken(
    passportToken: PassportToken,
    reentrancyContract: Contract,
    callback: any,
) {
    let data = [
        passportToken.interface.encodeFunctionData("mint", []),
    ];

    await testReentrancy(
        reentrancyContract,
        passportToken,
        data,
        callback,
    );
}

describe('5.1. PassportToken', async () => {
    async function passportTokenFixture(): Promise<PassportTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const minter1 = accounts[Constant.ADMIN_NUMBER + 1];
        const minter2 = accounts[Constant.ADMIN_NUMBER + 2];
        const minter3 = accounts[Constant.ADMIN_NUMBER + 3];
        
        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const passportToken = await deployPassportToken(
            deployer.address,
            admin.address,
            Initialization.PASSPORT_TOKEN_Name,
            Initialization.PASSPORT_TOKEN_Symbol,
            Initialization.PASSPORT_TOKEN_BaseURI,
            Initialization.PASSPORT_TOKEN_Fee,
            Initialization.PASSPORT_TOKEN_RoyaltyRate,
        ) as PassportToken;

        const currency1 = await deployCurrency(deployer, "MockCurrency1", "MCK1") as Currency;
        const currency2 = await deployCurrency(deployer, "MockCurrency2", "MCK2") as Currency;

        return {
            admin,
            passportToken,
            deployer,
            admins,
            minter1,
            minter2,
            minter3,
            currency1,
            currency2,
        };
    };

    async function beforePassportTokenTest({
        pause = false,
    } = {}): Promise<PassportTokenFixture> {
        const fixture = await loadFixture(passportTokenFixture);
        const { passportToken, admins, admin } = fixture;

        if (pause) {
            await callPausable_Pause(passportToken, admins, admin);
        }

        return {
            ...fixture,
        }
    }

    describe('5.1.1. initialize(address, string, string, string, uint256, uint256)', async () => {
        it('5.1.1.1. Deploy successfully', async () => {
            const { deployer, admin } = await beforePassportTokenTest();

            const PassportToken = await ethers.getContractFactory('PassportToken', deployer);

            const passportToken = await upgrades.deployProxy(
                PassportToken,
                [
                    admin.address,
                    Initialization.PASSPORT_TOKEN_Name,
                    Initialization.PASSPORT_TOKEN_Symbol,
                    Initialization.PASSPORT_TOKEN_BaseURI,
                    Initialization.PASSPORT_TOKEN_Fee,
                    Initialization.PASSPORT_TOKEN_RoyaltyRate,
                ]
            ) as PassportToken;
            await passportToken.deployed();
            
            expect(await passportToken.admin()).to.equal(admin.address);

            expect(await passportToken.name()).to.equal(Initialization.PASSPORT_TOKEN_Name);
            expect(await passportToken.symbol()).to.equal(Initialization.PASSPORT_TOKEN_Symbol);
            
            expect(await passportToken.tokenNumber()).to.equal(0);            

            const fee = await passportToken.fee();
            expect(fee).to.equal(Initialization.PASSPORT_TOKEN_Fee);

            const royaltyRate = await passportToken.getRoyaltyRate(0);
            expect(royaltyRate.value).to.equal(Initialization.PASSPORT_TOKEN_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const tx = passportToken.deployTransaction;
            await expect(tx).to
                .emit(passportToken, 'BaseURIUpdate').withArgs(Initialization.PASSPORT_TOKEN_BaseURI)
                .emit(passportToken, 'FeeUpdate').withArgs(Initialization.PASSPORT_TOKEN_Fee)
                .emit(passportToken, 'RoyaltyRateUpdate').withArgs(
                    (rate: any) => {
                        expect(structToObject(rate)).to.deep.equal({
                            value: Initialization.PASSPORT_TOKEN_RoyaltyRate,
                            decimals: Constant.COMMON_RATE_DECIMALS,
                        });
                        return true;
                    }
                );
        });

        it('5.1.1.2. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin } = await beforePassportTokenTest();

            const PassportToken = await ethers.getContractFactory('PassportToken', deployer);

            await expect(upgrades.deployProxy(PassportToken, [
                admin.address,
                Initialization.PASSPORT_TOKEN_Name,
                Initialization.PASSPORT_TOKEN_Symbol,
                Initialization.PASSPORT_TOKEN_BaseURI,
                Initialization.PASSPORT_TOKEN_Fee,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('5.1.2. updateBaseURI(string, bytes[])', async () => {
        it('5.1.2.1. updateBaseURI successfully', async () => {
            const { passportToken, admin, admins, minter1, minter2 } = await beforePassportTokenTest();

            const fee = await passportToken.fee();
            await callTransaction(passportToken.connect(minter1).mint({ value: fee }));
            await callTransaction(passportToken.connect(minter2).mint({ value: fee }));

            const newBaseURI = "new_base_uri";
            const tokenNumber = await passportToken.tokenNumber();

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'string'],
                [passportToken.address, 'updateBaseURI', newBaseURI]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());
            const tx = await passportToken.updateBaseURI(newBaseURI, signatures);
            await expect(tx).to.emit(passportToken, 'BaseURIUpdate').withArgs(newBaseURI);
            await expect(tx).to.emit(passportToken, 'BatchMetadataUpdate').withArgs(1, tokenNumber);

            expect(await passportToken.tokenURI(1)).to.equal(newBaseURI);
            expect(await passportToken.tokenURI(2)).to.equal(newBaseURI);
        });

        it('5.1.2.2. updateBaseURI unsuccessfully with invalid signature', async () => {
            const { passportToken, admin, admins } = await beforePassportTokenTest();

            const newBaseURI = "new_base_uri";

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'string'],
                [passportToken.address, 'updateBaseURI', newBaseURI]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(passportToken.updateBaseURI(newBaseURI, invalidSignatures)).to.be
                .revertedWithCustomError(passportToken, 'FailedVerification');
        });
    });

    describe('5.1.3. updateFee(uint256, bytes[])', async () => {
        it('5.1.3.1. updateFee successfully', async () => {
            const { passportToken, admin, admins } = await beforePassportTokenTest();

            const fee = await passportToken.fee();
            const newFee = fee.add(ethers.utils.parseEther('1'));

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256'],
                [passportToken.address, 'updateFee', newFee]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await passportToken.updateFee(newFee, signatures);
            await expect(tx).to.emit(passportToken, 'FeeUpdate').withArgs(newFee);
            
            expect(await passportToken.fee()).to.equal(newFee);
        });

        it('5.1.3.2. updateFee unsuccessfully with invalid signature', async () => {
            const { passportToken, admin, admins } = await beforePassportTokenTest();

            const fee = await passportToken.fee();
            const newFee = fee.add(ethers.utils.parseEther('1'));

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256'],
                [passportToken.address, 'updateFee', newFee]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(passportToken.updateFee(newFee, invalidSignatures)).to.be
                .revertedWithCustomError(passportToken, 'FailedVerification');
        });
    });

    describe('5.1.4. updateRoyaltyRate(uint256, bytes[])', async () => {
        it('5.1.4.1. updateRoyaltyRate successfully with valid signatures', async () => {
            const { passportToken, admin, admins } = await beforePassportTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [passportToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await passportToken.updateRoyaltyRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(passportToken, 'RoyaltyRateUpdate')
                .withArgs(
                    (rate: any) => {
                        expect(structToObject(rate)).to.deep.equal({
                            value: ethers.utils.parseEther('0.2'),
                            decimals: Constant.COMMON_RATE_DECIMALS,
                        });
                        return true;
                    }
                );

            const royaltyRate = await passportToken.getRoyaltyRate(0);
            expect(royaltyRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('5.1.4.2. updateRoyaltyRate unsuccessfully with invalid signatures', async () => {
            const { passportToken, admin, admins } = await beforePassportTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [passportToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(passportToken.updateRoyaltyRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('5.1.4.3. updateRoyaltyRate unsuccessfully with invalid rate', async () => {
            const { passportToken, admin, admins } = await beforePassportTokenTest();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [passportToken.address, "updateRoyaltyRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(passportToken.updateRoyaltyRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(passportToken, 'InvalidRate');
        });
    });

    describe('5.1.5. withdraw(address, address[], uint256[], bytes[])', async () => {
        it('5.1.5.1. Withdraw native tokens successfully', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            let receiver = randomWallet();

            await callTransaction(deployer.sendTransaction({
                to: passportToken.address,
                value: 2000
            }));

            let balance = await ethers.provider.getBalance(passportToken.address);
            expect(balance).to.equal(2000);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', receiver.address, [ethers.constants.AddressZero], [1200]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            let tx = await passportToken.withdraw(
                receiver.address,
                [ethers.constants.AddressZero],
                [1200],
                signatures,
            );
            await tx.wait();

            balance = await ethers.provider.getBalance(passportToken.address);
            expect(balance).to.equal(800);

            balance = await ethers.provider.getBalance(receiver.address);
            expect(balance).to.equal(1200);

            await callTransaction(deployer.sendTransaction({
                to: passportToken.address,
                value: 3000
            }));

            balance = await ethers.provider.getBalance(passportToken.address);
            expect(balance).to.equal(3800);

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', receiver.address, [ethers.constants.AddressZero], [3800]]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            tx = await passportToken.withdraw(
                receiver.address,
                [ethers.constants.AddressZero],
                [3800],
                signatures,
            );
            await tx.wait();

            balance = await ethers.provider.getBalance(passportToken.address);
            expect(balance).to.equal(0);

            balance = await ethers.provider.getBalance(receiver.address);
            expect(balance).to.equal(5000);
        });

        it('5.1.5.2. Withdraw ERC-20 tokens successfully', async () => {
            const { admins, admin, passportToken, currency1, currency2 } = await beforePassportTokenTest();

            let receiver = randomWallet();

            await callTransaction(currency1.mint(passportToken.address, 1000));
            await callTransaction(currency2.mint(passportToken.address, ethers.constants.MaxUint256));

            expect(await currency1.balanceOf(passportToken.address)).to.equal(1000);
            expect(await currency2.balanceOf(passportToken.address)).to.equal(ethers.constants.MaxUint256);
            expect(await currency1.balanceOf(receiver.address)).to.equal(0);
            expect(await currency2.balanceOf(receiver.address)).to.equal(0);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', receiver.address, [currency1.address, currency2.address], [700, ethers.constants.MaxUint256]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            let tx = await passportToken.withdraw(
                receiver.address,
                [currency1.address, currency2.address],
                [700, ethers.constants.MaxUint256],
                signatures,
            );
            await tx.wait();

            expect(await currency1.balanceOf(passportToken.address)).to.equal(300);
            expect(await currency2.balanceOf(passportToken.address)).to.equal(0);
            expect(await currency1.balanceOf(receiver.address)).to.equal(700);
            expect(await currency2.balanceOf(receiver.address)).to.equal(ethers.constants.MaxUint256);
        });

        it('5.1.5.3. Withdraw token successfully multiple times in the same tx', async () => {
            const { deployer, admins, admin, passportToken, currency1, currency2 } = await beforePassportTokenTest();

            let receiver = randomWallet();

            await callTransaction(deployer.sendTransaction({
                to: passportToken.address,
                value: 2000
            }));

            await callTransaction(currency1.mint(passportToken.address, 1000));
            await callTransaction(currency2.mint(passportToken.address, ethers.constants.MaxUint256));

            expect(await currency1.balanceOf(passportToken.address)).to.equal(1000);
            expect(await currency2.balanceOf(passportToken.address)).to.equal(ethers.constants.MaxUint256);
            expect(await currency1.balanceOf(receiver.address)).to.equal(0);
            expect(await currency2.balanceOf(receiver.address)).to.equal(0);

            const currencies = [ethers.constants.AddressZero, ethers.constants.AddressZero, currency1.address, currency2.address];
            const amounts = [100, 200, 400, 800];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', receiver.address, currencies, amounts]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            let tx = await passportToken.withdraw(
                receiver.address,
                currencies,
                amounts,
                signatures,
            );
            await tx.wait();

            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(1700);
            expect(await ethers.provider.getBalance(receiver.address)).to.equal(300);

            expect(await currency1.balanceOf(passportToken.address)).to.equal(600);
            expect(await currency1.balanceOf(receiver.address)).to.equal(400);
            expect(await currency2.balanceOf(passportToken.address)).to.equal(ethers.constants.MaxUint256.sub(800));
            expect(await currency2.balanceOf(receiver.address)).to.equal(800);
        });

        it('5.1.5.4. Withdraw unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', deployer.address, [ethers.constants.AddressZero], [1000]]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(passportToken.withdraw(
                deployer.address,
                [ethers.constants.AddressZero],
                [1000],
                invalidSignatures,
            )).to.be.revertedWithCustomError(passportToken, 'FailedVerification');
        });

        it('5.1.5.5. Withdraw unsuccessfully with insufficient native tokens', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', deployer.address, [ethers.constants.AddressZero], [1000]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(passportToken.withdraw(
                deployer.address,
                [ethers.constants.AddressZero],
                [1000],
                signatures
            )).to.be.revertedWithCustomError(passportToken, 'FailedTransfer');
        })

        it('5.1.5.6. Withdraw unsuccessfully with insufficient ERC20 tokens', async () => {
            const { deployer, admins, admin, passportToken, currency1, currency2 } = await beforePassportTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', deployer.address, [currency1.address], [1000]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(passportToken.withdraw(
                deployer.address,
                [currency1.address],
                [1000],
                signatures
            )).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        })

        it('5.1.5.7. withdraw unsuccessfully when native token receiving failed', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(deployer.sendTransaction({
                to: passportToken.address,
                value: 1000,
            }));

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', failReceiver.address, [ethers.constants.AddressZero], [1000]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(passportToken.withdraw(
                failReceiver.address,
                [ethers.constants.AddressZero],
                [1000],
                signatures
            )).to.be.revertedWithCustomError(passportToken, 'FailedTransfer');
        });

        it('5.1.5.8. withdraw unsuccessfully when the contract is reentered', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            const reentrancyERC20 = await deployReentrancyERC20(deployer);

            await callTransaction(reentrancyERC20.mint(passportToken.address, 1000));

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', reentrancyERC20.address, [reentrancyERC20.address], [200]]
            );

            let calldata = passportToken.interface.encodeFunctionData('withdraw', [
                reentrancyERC20.address,
                [reentrancyERC20.address],
                [200],
                await getSignatures(message, admins, (await admin.nonce()).add(1))
            ]);

            await callTransaction(reentrancyERC20.updateReentrancyPlan(
                passportToken.address,
                calldata
            ));

            calldata = passportToken.interface.encodeFunctionData('withdraw', [
                reentrancyERC20.address,
                [reentrancyERC20.address],
                [200],
                await getSignatures(message, admins, await admin.nonce())
            ]);

            await expect(reentrancyERC20.call(passportToken.address, calldata))
                .to.be.revertedWith('ReentrancyGuard: reentrant call');

            const balance = await reentrancyERC20.balanceOf(passportToken.address);
            expect(balance).to.equal(1000);
        });
    });

    describe('5.1.6. mint()', async () => {
        it('5.1.6.1. mint successfully', async () => {
            const { passportToken, minter1, minter2 } = await beforePassportTokenTest();

            const fee = await passportToken.fee();

            const initMinter1Balance = await ethers.provider.getBalance(minter1.address);
            const initMinter2Balance = await ethers.provider.getBalance(minter2.address);
            const initPassportTokenBalance = await ethers.provider.getBalance(passportToken.address);

            // Mint with just enough value
            const tx1 = await passportToken.connect(minter1).mint({ value: fee });
            const receipt1 = await tx1.wait();
            await expect(tx1).to
                .emit(passportToken, 'NewToken')
                .withArgs(1, minter1.address);

            expect(await passportToken.tokenNumber()).to.equal(1);
            expect(await passportToken.ownerOf(1)).to.equal(minter1.address);
            expect(await passportToken.tokenURI(1)).to.equal(Initialization.PASSPORT_TOKEN_BaseURI);

            const tx1GasFee = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter1.address)).to.equal(initMinter1Balance.sub(tx1GasFee).sub(fee));
            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(initPassportTokenBalance.add(fee));
            
            // Refund when minting with more value than needed
            const tx2 = await passportToken.connect(minter2).mint({ value: fee.add(ethers.utils.parseEther('1')) });
            const receipt2 = await tx2.wait();
            await expect(tx2).to
                .emit(passportToken, 'NewToken')
                .withArgs(2, minter2.address);

            expect(await passportToken.tokenNumber()).to.equal(2);
            expect(await passportToken.ownerOf(2)).to.equal(minter2.address);
            expect(await passportToken.tokenURI(2)).to.equal(Initialization.PASSPORT_TOKEN_BaseURI);

            const tx2GasFee = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter2.address)).to.equal(initMinter2Balance.sub(tx2GasFee).sub(fee));
            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(initPassportTokenBalance.add(fee).add(fee));
        });

        it('5.1.6.2. mint successfully when paused', async () => {
            const { passportToken, minter1, minter2 } = await beforePassportTokenTest({
                pause: true,
            });

            const fee = await passportToken.fee();
            await expect(passportToken.connect(minter1).mint({ value: fee }))
                .to.be.revertedWith('Pausable: paused');
        });

        it('5.1.6.3. mint unsuccessfully when already minted', async () => {
            const { passportToken, minter1, minter2 } = await beforePassportTokenTest();

            const fee = await passportToken.fee();

            await callTransaction(passportToken.connect(minter1).mint({ value: fee }));
            await expect(passportToken.connect(minter1).mint({ value: fee }))
                .to.be.revertedWithCustomError(passportToken, 'AlreadyMinted');

            await callTransaction(passportToken.connect(minter2).mint({ value: fee }));
            await expect(passportToken.connect(minter2).mint({ value: fee }))
                .to.be.revertedWithCustomError(passportToken, 'AlreadyMinted');
        });

        it('5.1.6.4. mint unsuccessfully with insufficient value', async () => {
            const { passportToken, minter1 } = await beforePassportTokenTest();

            await expect(passportToken.connect(minter1).mint())
                .to.be.revertedWithCustomError(passportToken, 'InsufficientValue');
        });

        it('5.1.6.5. mint unsuccessfully when sender reenter the contract', async () => {
            const { passportToken, deployer, minter1 } = await beforePassportTokenTest();

            const reentrancy = await deployReentrancy(deployer);

            const fee = await passportToken.fee();

            const callData = passportToken.interface.encodeFunctionData('mint', []);

            await testReentrancy_passportToken(
                passportToken,
                reentrancy,
                async () => {
                    await expect(reentrancy.call(passportToken.address, callData, { value: fee.add(ethers.utils.parseEther('1')) }))
                        .to.be.revertedWithCustomError(passportToken, 'FailedRefund');
                },
            );
        });
    });

    describe('5.1.7. supportsInterface(bytes4)', async () => {
        it('5.1.7.1. return true for appropriate interface', async () => {
            const { passportToken } = await beforePassportTokenTest();

            const IERC4906Upgradeable = IERC4906Upgradeable__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();
            const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
            const IERC721MetadataUpgradeable = IERC721MetadataUpgradeable__factory.createInterface();
            const ICommon = ICommon__factory.createInterface();
            const IRoyaltyRateProposer = IRoyaltyRateProposer__factory.createInterface();

            const IERC4906UpgradeableInterfaceId = getInterfaceID(IERC4906Upgradeable, [IERC165Upgradeable, IERC721Upgradeable]);
            const IRoyaltyRateProposerInterfaceId = getInterfaceID(IRoyaltyRateProposer, [ICommon, IERC165Upgradeable, IERC2981Upgradeable]);
            const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);
            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);
            const IERC721UpgradeableInterfaceId = getInterfaceID(IERC721Upgradeable, [IERC165Upgradeable]);
            const IERC721MetadataUpgradeableInterfaceId = getInterfaceID(IERC721MetadataUpgradeable, [IERC721Upgradeable]);

            expect(await passportToken.supportsInterface(getBytes4Hex(IERC4906UpgradeableInterfaceId))).to.equal(true);
            expect(await passportToken.supportsInterface(getBytes4Hex(IRoyaltyRateProposerInterfaceId))).to.equal(true);
            expect(await passportToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await passportToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await passportToken.supportsInterface(getBytes4Hex(IERC721UpgradeableInterfaceId))).to.equal(true);
            expect(await passportToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))).to.equal(true);
        });
    });
});
