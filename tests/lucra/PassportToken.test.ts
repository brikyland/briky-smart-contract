import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers, upgrades } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import {
    IERC165UpgradeableInterfaceId,
    IERC721MetadataUpgradeableInterfaceId,
    IERC721UpgradeableInterfaceId,
    IERC2981UpgradeableInterfaceId,
    IERC4906UpgradeableInterfaceId,
} from '@tests/interfaces';
import { Constant } from '@tests/test.constant';

// @tests/lucra
import { Initialization } from '@tests/lucra/test.initialization';

// @typechain-types
import { Admin, PassportToken, Currency } from '@typechain-types';

// @utils
import { getBytes4Hex, structToObject } from '@utils/utils';
import { callTransaction, getSignatures, randomWallet, testReentrancy } from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPassportToken } from '@utils/deployments/lucra/passportToken';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';
import { deployReentrancyReceiver } from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/models/lucra
import {
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeParams,
    UpdateFeeParamsInput,
    UpdateRoyaltyRateParams,
    UpdateRoyaltyRateParamsInput,
    WithdrawParams,
    WithdrawParamsInput,
} from '@utils/models/lucra/passportToken';

// @utils/signatures/lucra
import {
    getUpdateBaseURISignatures,
    getUpdateFeeSignatures,
    getUpdateRoyaltyRateSignatures,
    getWithdrawSignatures,
} from '@utils/signatures/lucra/passportToken';

// @utils/transaction/common
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/lucra
import {
    getPassportTokenTx_Mint,
    getPassportTokenTx_UpdateBaseURI,
    getPassportTokenTx_UpdateFee,
    getPassportTokenTx_UpdateRoyaltyRate,
    getPassportTokenTx_Withdraw,
    getPassportTokenTxByInput_UpdateBaseURI,
    getPassportTokenTxByInput_UpdateFee,
    getPassportTokenTxByInput_UpdateRoyaltyRate,
    getPassportTokenTxByInput_Withdraw,
} from '@utils/transaction/lucra/passportToken';

interface PassportTokenFixture {
    deployer: any;
    admins: any[];
    minter1: any;
    minter2: any;
    minter3: any;

    admin: Admin;
    currency1: Currency;
    currency2: Currency;
    passportToken: PassportToken;
}

async function testReentrancy_passportToken(passportToken: PassportToken, reentrancyContract: Contract, callback: any) {
    let data = [passportToken.interface.encodeFunctionData('mint', [])];

    await testReentrancy(reentrancyContract, passportToken, data, callback);
}

describe('5.1. PassportToken', async () => {
    async function passportTokenFixture(): Promise<PassportTokenFixture> {
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

        const currency1 = (await deployCurrency(deployer, 'MockCurrency1', 'MCK1')) as Currency;
        const currency2 = (await deployCurrency(deployer, 'MockCurrency2', 'MCK2')) as Currency;

        const passportToken = (await deployPassportToken(
            deployer.address,
            admin.address,
            Initialization.PASSPORT_TOKEN_Name,
            Initialization.PASSPORT_TOKEN_Symbol,
            Initialization.PASSPORT_TOKEN_BaseURI,
            Initialization.PASSPORT_TOKEN_Fee,
            Initialization.PASSPORT_TOKEN_RoyaltyRate
        )) as PassportToken;

        return {
            deployer,
            admins,
            minter1,
            minter2,
            minter3,
            currency1,
            currency2,
            admin,
            passportToken,
        };
    }

    async function beforePassportTokenTest({ pause = false } = {}): Promise<PassportTokenFixture> {
        const fixture = await loadFixture(passportTokenFixture);
        const { deployer, passportToken, admins, admin } = fixture;

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(passportToken, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('5.1.1. initialize(address,string,string,string,uint256,uint256)', async () => {
        it('5.1.1.1. Deploy successfully', async () => {
            const { deployer, admin } = await beforePassportTokenTest();

            const PassportToken = await ethers.getContractFactory('PassportToken', deployer);

            const passportToken = (await upgrades.deployProxy(PassportToken, [
                admin.address,
                Initialization.PASSPORT_TOKEN_Name,
                Initialization.PASSPORT_TOKEN_Symbol,
                Initialization.PASSPORT_TOKEN_BaseURI,
                Initialization.PASSPORT_TOKEN_Fee,
                Initialization.PASSPORT_TOKEN_RoyaltyRate,
            ])) as PassportToken;
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
            await expect(tx)
                .to.emit(passportToken, 'BaseURIUpdate')
                .withArgs(Initialization.PASSPORT_TOKEN_BaseURI)
                .emit(passportToken, 'FeeUpdate')
                .withArgs(Initialization.PASSPORT_TOKEN_Fee)
                .emit(passportToken, 'RoyaltyRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: Initialization.PASSPORT_TOKEN_RoyaltyRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });
        });

        it('5.1.1.2. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin } = await beforePassportTokenTest();

            const PassportToken = await ethers.getContractFactory('PassportToken', deployer);

            await expect(
                upgrades.deployProxy(PassportToken, [
                    admin.address,
                    Initialization.PASSPORT_TOKEN_Name,
                    Initialization.PASSPORT_TOKEN_Symbol,
                    Initialization.PASSPORT_TOKEN_BaseURI,
                    Initialization.PASSPORT_TOKEN_Fee,
                    Constant.COMMON_RATE_MAX_FRACTION.add(1),
                ])
            ).to.be.reverted;
        });
    });

    /* --- Administration --- */
    describe('5.1.2. updateBaseURI(string,bytes[])', async () => {
        it('5.1.2.1. Update base URI successfully', async () => {
            const { deployer, passportToken, admin, admins, minter1, minter2 } = await beforePassportTokenTest();

            const fee = await passportToken.fee();
            await callTransaction(passportToken.connect(minter1).mint({ value: fee }));
            await callTransaction(passportToken.connect(minter2).mint({ value: fee }));

            const newBaseURI = 'new_base_uri';
            const tokenNumber = await passportToken.tokenNumber();

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: newBaseURI,
            };
            const tx = await getPassportTokenTxByInput_UpdateBaseURI(
                passportToken,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await expect(tx).to.emit(passportToken, 'BaseURIUpdate').withArgs(newBaseURI);
            await expect(tx).to.emit(passportToken, 'BatchMetadataUpdate').withArgs(1, tokenNumber);

            expect(await passportToken.tokenURI(1)).to.equal(newBaseURI);
            expect(await passportToken.tokenURI(2)).to.equal(newBaseURI);
        });

        it('5.1.2.2. Update base URI unsuccessfully with invalid signature', async () => {
            const { deployer, passportToken, admin, admins } = await beforePassportTokenTest();

            const newBaseURI = 'new_base_uri';

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: newBaseURI,
            };
            const params: UpdateBaseURIParams = {
                ...paramsInput,
                signatures: await getUpdateBaseURISignatures(passportToken, paramsInput, admin, admins, false),
            };
            await expect(
                getPassportTokenTx_UpdateBaseURI(passportToken, deployer, params)
            ).to.be.revertedWithCustomError(passportToken, 'FailedVerification');
        });
    });

    describe('5.1.3. updateFee(uint256,bytes[])', async () => {
        it('5.1.3.1. Update fee successfully', async () => {
            const { deployer, passportToken, admin, admins } = await beforePassportTokenTest();

            const fee = await passportToken.fee();
            const newFee = fee.add(ethers.utils.parseEther('1'));

            const paramsInput: UpdateFeeParamsInput = {
                fee: newFee,
            };
            const tx = await getPassportTokenTxByInput_UpdateFee(passportToken, deployer, paramsInput, admin, admins);
            await expect(tx).to.emit(passportToken, 'FeeUpdate').withArgs(newFee);

            expect(await passportToken.fee()).to.equal(newFee);
        });

        it('5.1.3.2. Update fee unsuccessfully with invalid signature', async () => {
            const { deployer, passportToken, admin, admins } = await beforePassportTokenTest();

            const fee = await passportToken.fee();
            const newFee = fee.add(ethers.utils.parseEther('1'));

            const paramsInput: UpdateFeeParamsInput = {
                fee: newFee,
            };
            const params: UpdateFeeParams = {
                ...paramsInput,
                signatures: await getUpdateFeeSignatures(passportToken, paramsInput, admin, admins, false),
            };
            await expect(getPassportTokenTx_UpdateFee(passportToken, deployer, params)).to.be.revertedWithCustomError(
                passportToken,
                'FailedVerification'
            );
        });
    });

    describe('5.1.4. updateRoyaltyRate(uint256,bytes[])', async () => {
        it('5.1.4.1. Update royalty rate successfully with valid signatures', async () => {
            const { deployer, passportToken, admin, admins } = await beforePassportTokenTest();

            const paramsInput: UpdateRoyaltyRateParamsInput = {
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const tx = await getPassportTokenTxByInput_UpdateRoyaltyRate(
                passportToken,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await expect(tx)
                .to.emit(passportToken, 'RoyaltyRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: paramsInput.royaltyRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            expect(structToObject(await passportToken.getRoyaltyRate(0))).to.deep.equal({
                value: paramsInput.royaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('5.1.4.2. Update royalty rate unsuccessfully with invalid signatures', async () => {
            const { deployer, passportToken, admin, admins } = await beforePassportTokenTest();

            const paramsInput: UpdateRoyaltyRateParamsInput = {
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const params: UpdateRoyaltyRateParams = {
                ...paramsInput,
                signatures: await getUpdateRoyaltyRateSignatures(passportToken, paramsInput, admin, admins, false),
            };
            await expect(
                getPassportTokenTx_UpdateRoyaltyRate(passportToken, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('5.1.4.3. Update royalty rate unsuccessfully with invalid rate', async () => {
            const { deployer, passportToken, admin, admins } = await beforePassportTokenTest();

            await expect(
                getPassportTokenTxByInput_UpdateRoyaltyRate(
                    passportToken,
                    deployer,
                    {
                        royaltyRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(passportToken, 'InvalidRate');
        });
    });

    describe('5.1.5. withdraw(address,address[],uint256[],bytes[])', async () => {
        it('5.1.5.1. Withdraw native tokens successfully', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            let receiver = randomWallet();

            await callTransaction(
                deployer.sendTransaction({
                    to: passportToken.address,
                    value: 2000,
                })
            );

            let balance = await ethers.provider.getBalance(passportToken.address);
            expect(balance).to.equal(2000);

            const paramsInput1: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(1200)],
            };
            const tx1 = await getPassportTokenTxByInput_Withdraw(passportToken, deployer, paramsInput1, admin, admins);
            await tx1.wait();

            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(800);
            expect(await ethers.provider.getBalance(receiver.address)).to.equal(1200);

            await callTransaction(
                deployer.sendTransaction({
                    to: passportToken.address,
                    value: 3000,
                })
            );

            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(3800);

            const paramsInput2: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(3800)],
            };
            const tx2 = await getPassportTokenTxByInput_Withdraw(passportToken, deployer, paramsInput2, admin, admins);
            await tx2.wait();

            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(0);
            expect(await ethers.provider.getBalance(receiver.address)).to.equal(5000);
        });

        it('5.1.5.2. Withdraw ERC-20 tokens successfully', async () => {
            const { deployer, admins, admin, passportToken, currency1, currency2 } = await beforePassportTokenTest();

            let receiver = randomWallet();

            await callTransaction(currency1.mint(passportToken.address, 1000));
            await callTransaction(currency2.mint(passportToken.address, ethers.constants.MaxUint256));

            expect(await currency1.balanceOf(passportToken.address)).to.equal(1000);
            expect(await currency2.balanceOf(passportToken.address)).to.equal(ethers.constants.MaxUint256);
            expect(await currency1.balanceOf(receiver.address)).to.equal(0);
            expect(await currency2.balanceOf(receiver.address)).to.equal(0);

            const paramsInput1: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [currency1.address, currency2.address],
                values: [BigNumber.from(700), ethers.constants.MaxUint256],
            };
            const tx = await getPassportTokenTxByInput_Withdraw(passportToken, deployer, paramsInput1, admin, admins);
            await tx.wait();

            expect(await currency1.balanceOf(passportToken.address)).to.equal(300);
            expect(await currency2.balanceOf(passportToken.address)).to.equal(0);
            expect(await currency1.balanceOf(receiver.address)).to.equal(700);
            expect(await currency2.balanceOf(receiver.address)).to.equal(ethers.constants.MaxUint256);
        });

        it('5.1.5.3. Withdraw token successfully multiple times in the same tx', async () => {
            const { deployer, admins, admin, passportToken, currency1, currency2 } = await beforePassportTokenTest();

            let receiver = randomWallet();

            await callTransaction(
                deployer.sendTransaction({
                    to: passportToken.address,
                    value: 2000,
                })
            );

            await callTransaction(currency1.mint(passportToken.address, 1000));
            await callTransaction(currency2.mint(passportToken.address, ethers.constants.MaxUint256));

            expect(await currency1.balanceOf(passportToken.address)).to.equal(1000);
            expect(await currency2.balanceOf(passportToken.address)).to.equal(ethers.constants.MaxUint256);
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
            const tx = await getPassportTokenTxByInput_Withdraw(passportToken, deployer, paramsInput, admin, admins);
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

            const paramsInput: WithdrawParamsInput = {
                receiver: deployer.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(1000)],
            };
            const params: WithdrawParams = {
                ...paramsInput,
                signatures: await getWithdrawSignatures(passportToken, paramsInput, admin, admins, false),
            };
            await expect(getPassportTokenTx_Withdraw(passportToken, deployer, params)).to.be.revertedWithCustomError(
                passportToken,
                'FailedVerification'
            );
        });

        it('5.1.5.5. Withdraw unsuccessfully with insufficient native tokens', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            await expect(
                getPassportTokenTxByInput_Withdraw(
                    passportToken,
                    deployer,
                    {
                        receiver: deployer.address,
                        currencies: [ethers.constants.AddressZero],
                        values: [BigNumber.from(1000)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(passportToken, 'FailedTransfer');
        });

        it('5.1.5.6. Withdraw unsuccessfully with insufficient ERC20 tokens', async () => {
            const { deployer, admins, admin, passportToken, currency1 } = await beforePassportTokenTest();

            await expect(
                getPassportTokenTxByInput_Withdraw(
                    passportToken,
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

        it('5.1.5.7. Withdraw unsuccessfully when transferring native token to withdrawer failed', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(
                deployer.sendTransaction({
                    to: passportToken.address,
                    value: 1000,
                })
            );

            await expect(
                getPassportTokenTxByInput_Withdraw(
                    passportToken,
                    deployer,
                    {
                        receiver: failReceiver.address,
                        currencies: [ethers.constants.AddressZero],
                        values: [BigNumber.from(1000)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(passportToken, 'FailedTransfer');
        });

        it('5.1.5.8. Withdraw unsuccessfully when the contract is reentered', async () => {
            const { deployer, admins, admin, passportToken } = await beforePassportTokenTest();

            const reentrancyERC20 = await deployReentrancyERC20(deployer, true, false);

            await callTransaction(reentrancyERC20.mint(passportToken.address, 1000));

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [passportToken.address, 'withdraw', reentrancyERC20.address, [reentrancyERC20.address], [200]]
            );

            await callTransaction(
                reentrancyERC20.updateReentrancyPlan(
                    passportToken.address,
                    passportToken.interface.encodeFunctionData('withdraw', [
                        reentrancyERC20.address,
                        [reentrancyERC20.address],
                        [200],
                        await getSignatures(message, admins, (await admin.nonce()).add(1)),
                    ])
                )
            );

            await expect(
                reentrancyERC20.call(
                    passportToken.address,
                    passportToken.interface.encodeFunctionData('withdraw', [
                        reentrancyERC20.address,
                        [reentrancyERC20.address],
                        [200],
                        await getSignatures(message, admins, await admin.nonce()),
                    ])
                )
            ).to.be.revertedWith('ReentrancyGuard: reentrant call');

            const balance = await reentrancyERC20.balanceOf(passportToken.address);
            expect(balance).to.equal(1000);
        });
    });

    /* --- Query --- */
    describe('5.1.6. supportsInterface(bytes4)', async () => {
        it('5.1.6.1. Return true for appropriate interface', async () => {
            const { passportToken } = await beforePassportTokenTest();

            expect(await passportToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await passportToken.supportsInterface(getBytes4Hex(IERC721UpgradeableInterfaceId))).to.equal(true);
            expect(await passportToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))).to.equal(
                true
            );
            expect(await passportToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await passportToken.supportsInterface(getBytes4Hex(IERC4906UpgradeableInterfaceId))).to.equal(true);
        });
    });

    /* --- Command --- */
    describe('5.1.7. mint()', async () => {
        it('5.1.7.1. Mint successfully', async () => {
            const { passportToken, minter1, minter2 } = await beforePassportTokenTest();

            const fee = await passportToken.fee();

            const initMinter1Balance = await ethers.provider.getBalance(minter1.address);
            const initMinter2Balance = await ethers.provider.getBalance(minter2.address);
            const initPassportTokenBalance = await ethers.provider.getBalance(passportToken.address);

            // Mint with just enough value
            const tx1 = await getPassportTokenTx_Mint(passportToken, minter1, {
                value: fee,
            });
            const receipt1 = await tx1.wait();
            await expect(tx1).to.emit(passportToken, 'NewToken').withArgs(1, minter1.address);

            expect(await passportToken.tokenNumber()).to.equal(1);
            expect(await passportToken.ownerOf(1)).to.equal(minter1.address);
            expect(await passportToken.tokenURI(1)).to.equal(Initialization.PASSPORT_TOKEN_BaseURI);

            const tx1GasFee = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter1.address)).to.equal(
                initMinter1Balance.sub(tx1GasFee).sub(fee)
            );
            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(initPassportTokenBalance.add(fee));

            // Refund when minting with more value than needed
            const tx2 = await getPassportTokenTx_Mint(passportToken, minter2, {
                value: fee.add(ethers.utils.parseEther('1')),
            });
            const receipt2 = await tx2.wait();
            await expect(tx2).to.emit(passportToken, 'NewToken').withArgs(2, minter2.address);

            expect(await passportToken.tokenNumber()).to.equal(2);
            expect(await passportToken.ownerOf(2)).to.equal(minter2.address);
            expect(await passportToken.tokenURI(2)).to.equal(Initialization.PASSPORT_TOKEN_BaseURI);

            const tx2GasFee = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter2.address)).to.equal(
                initMinter2Balance.sub(tx2GasFee).sub(fee)
            );
            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(
                initPassportTokenBalance.add(fee).add(fee)
            );
        });

        it('5.1.7.2. Mint successfully when paused', async () => {
            const { passportToken, minter1 } = await beforePassportTokenTest({
                pause: true,
            });

            const fee = await passportToken.fee();
            await expect(getPassportTokenTx_Mint(passportToken, minter1, { value: fee })).to.be.revertedWith(
                'Pausable: paused'
            );
        });

        it('5.1.7.3. Mint unsuccessfully with already minted token', async () => {
            const { passportToken, minter1, minter2 } = await beforePassportTokenTest();

            const fee = await passportToken.fee();

            await callTransaction(getPassportTokenTx_Mint(passportToken, minter1, { value: fee }));
            await expect(getPassportTokenTx_Mint(passportToken, minter1, { value: fee })).to.be.revertedWithCustomError(
                passportToken,
                'AlreadyMinted'
            );

            await callTransaction(getPassportTokenTx_Mint(passportToken, minter2, { value: fee }));
            await expect(getPassportTokenTx_Mint(passportToken, minter2, { value: fee })).to.be.revertedWithCustomError(
                passportToken,
                'AlreadyMinted'
            );
        });

        it('5.1.7.4. Mint unsuccessfully with insufficient value', async () => {
            const { passportToken, minter1 } = await beforePassportTokenTest();

            await expect(getPassportTokenTx_Mint(passportToken, minter1)).to.be.revertedWithCustomError(
                passportToken,
                'InsufficientValue'
            );
        });

        it('5.1.7.5. Mint unsuccessfully when sender reenter the contract', async () => {
            const { passportToken, deployer } = await beforePassportTokenTest();

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            const fee = await passportToken.fee();

            await testReentrancy_passportToken(passportToken, reentrancy, async () => {
                await expect(
                    reentrancy.call(passportToken.address, passportToken.interface.encodeFunctionData('mint', []), {
                        value: fee.add(ethers.utils.parseEther('1')),
                    })
                ).to.be.revertedWithCustomError(passportToken, 'FailedRefund');
            });
        });
    });
});
