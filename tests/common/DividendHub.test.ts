import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber } from 'ethers';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import {
    Admin,
    Currency,
    FailReceiver,
    Governor,
    Governor__factory,
    DividendHub,
    ReentrancyERC20,
} from '@typechain-types';

// @utils
import {
    callTransaction,
    expectRevertWithModifierCustomError,
    prepareERC20,
    prepareNativeToken,
} from '@utils/blockchain';
import { expectEqualWithErrorMargin } from '@utils/testHelper';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployDividendHub } from '@utils/deployments/common/dividendHub';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';

// @utils/models/common
import { IssueDividendParams } from '@utils/models/common/dividendHub';

// @utils/transaction/common
import {
    getCallDividendHubTx_IssueDividend,
    getDividendTx_IssueDividend,
    getWithdrawTx,
} from '@utils/transaction/common/dividendHub';
import {
    getAdminTxByInput_AuthorizeGovernors,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

interface DividendHubFixture {
    deployer: any;
    admins: any[];
    issuer1: any;
    issuer2: any;
    receiver1: any;
    receiver2: any;
    receiver3: any;

    admin: Admin;
    currencies: Currency[];
    governor: MockContract<Governor>;
    dividendHub: DividendHub;

    reentrancyERC20: ReentrancyERC20;
    failReceiver: FailReceiver;
}

describe('1.4. DividendHub', async () => {
    afterEach(async () => {
        const fixture = await loadFixture(dividendHubFixture);
        const { governor } = fixture;
        governor.totalEquityAt.reset();
    });

    async function dividendHubFixture(): Promise<DividendHubFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, issuer1, issuer2, receiver1, receiver2, receiver3] =
            await ethers.getSigners();
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

        const currency = (await deployCurrency(deployer.address, 'MockCurrency1', 'MCK1')) as Currency;
        const currencies = [currency];

        const SmockGovernor = await smock.mock<Governor__factory>('Governor');
        const governor = await SmockGovernor.deploy();
        await governor.initialize(admin.address);

        const dividendHub = (await deployDividendHub(deployer.address, admin.address)) as DividendHub;

        const reentrancyERC20 = (await deployReentrancyERC20(deployer, true, false)) as ReentrancyERC20;
        const failReceiver = (await deployFailReceiver(deployer, false, false)) as FailReceiver;

        return {
            deployer,
            admins,
            issuer1,
            issuer2,
            receiver1,
            receiver2,
            receiver3,
            admin,
            currencies,
            governor,
            dividendHub,
            failReceiver,
            reentrancyERC20,
        };
    }

    async function beforeDividendHubTest({
        skipRegisterCurrencies = false,
        skipAuthorizeGovernors = false,
        skipFundERC20ForIssuer = false,
        skipInitGovernorTokens = false,
        useReentrancyERC20 = false,
        useFailReceiver = false,
        issueSampleDividends = false,
        pause = false,
    } = {}): Promise<DividendHubFixture> {
        const fixture = await loadFixture(dividendHubFixture);
        const {
            deployer,
            admins,
            receiver1,
            receiver2,
            receiver3,
            issuer1,
            issuer2,
            admin,
            governor,
            dividendHub,
            reentrancyERC20,
            failReceiver,
        } = fixture;
        let { currencies } = fixture;

        if (useReentrancyERC20) {
            currencies = [reentrancyERC20 as any, ...currencies];
        }

        if (!skipRegisterCurrencies) {
            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, ...currencies.map((currency) => currency.address)],
                        isAvailable: [true, ...currencies.map((_) => true)],
                        isExclusive: [false, ...currencies.map((_) => true)],
                    },
                    admins
                )
            );
        }

        if (!skipAuthorizeGovernors) {
            await callTransaction(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: [governor.address],
                        isGovernor: true,
                    },
                    admins
                )
            );
        }

        if (!skipFundERC20ForIssuer) {
            await prepareERC20(
                currencies[0],
                [issuer1, issuer2, receiver1, receiver2, receiver3],
                [dividendHub],
                ethers.utils.parseEther(String(1e9))
            );
        }

        if (!skipInitGovernorTokens) {
            if (useFailReceiver) {
                await callTransaction(
                    failReceiver.call(
                        governor.address,
                        governor.interface.encodeFunctionData('mint', [1, ethers.utils.parseEther('2')])
                    )
                );
            } else {
                await callTransaction(governor.connect(receiver1).mint(1, ethers.utils.parseEther('2')));
            }
            await callTransaction(governor.connect(receiver2).mint(1, ethers.utils.parseEther('3')));
            await callTransaction(governor.connect(receiver3).mint(1, ethers.utils.parseEther('5')));

            if (useFailReceiver) {
                await callTransaction(
                    failReceiver.call(
                        governor.address,
                        governor.interface.encodeFunctionData('mint', [2, ethers.utils.parseEther('100')])
                    )
                );
            } else {
                await callTransaction(governor.connect(receiver1).mint(2, ethers.utils.parseEther('100')));
            }
            await callTransaction(governor.connect(receiver2).mint(2, ethers.utils.parseEther('300')));
        }

        if (issueSampleDividends) {
            await callTransaction(
                getDividendTx_IssueDividend(
                    dividendHub,
                    issuer1,
                    {
                        governor: governor.address,
                        tokenId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1000'),
                        currency: ethers.constants.AddressZero,
                        note: 'Data_1',
                    },
                    { value: ethers.utils.parseEther('1000') }
                )
            );

            await callTransaction(
                getDividendTx_IssueDividend(
                    dividendHub,
                    issuer1,
                    {
                        governor: governor.address,
                        tokenId: BigNumber.from(1),
                        value: ethers.utils.parseEther('100'),
                        currency: ethers.constants.AddressZero,
                        note: 'Data_2',
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            );

            await callTransaction(
                getDividendTx_IssueDividend(
                    dividendHub,
                    issuer2,
                    {
                        governor: governor.address,
                        tokenId: BigNumber.from(2),
                        value: ethers.utils.parseEther('2000'),
                        currency: currencies[0].address,
                        note: 'Data_3',
                    },
                    { value: ethers.utils.parseEther('2000') }
                )
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(dividendHub, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('1.4.1. initialize(address)', async () => {
        it('1.4.1.1. Deploy successfully', async () => {
            const fixture = await loadFixture(dividendHubFixture);
            const { admin, dividendHub } = fixture;

            expect(await dividendHub.admin()).to.equal(admin.address);
        });
    });

    /* --- Query --- */
    describe('1.4.2. getDividend(uint256)', async () => {
        it('1.4.2.1. Return correct dividend', async () => {
            const fixture = await beforeDividendHubTest();

            const { issuer1, governor, dividendHub } = fixture;

            const tokenId1 = 1;
            const value1 = ethers.utils.parseEther('1000');
            const totalVote = await governor.totalSupply(tokenId1);

            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(
                getDividendTx_IssueDividend(
                    dividendHub,
                    issuer1,
                    {
                        governor: governor.address,
                        tokenId: BigNumber.from(tokenId1),
                        value: value1,
                        currency: ethers.constants.AddressZero,
                        note: 'Data_1',
                    },
                    { value: value1.add(ethers.utils.parseEther('1')) }
                )
            );

            const dividend = await dividendHub.getDividend(tokenId1);
            expect(dividend.tokenId).to.equal(tokenId1);
            expect(dividend.remainWeight).to.equal(totalVote);
            expect(dividend.remainValue).to.equal(value1);
            expect(dividend.currency).to.equal(ethers.constants.AddressZero);
            expect(dividend.at(4)).to.equal(timestamp);
            expect(dividend.governor).to.equal(governor.address);
        });

        it('1.4.2.2. Revert with invalid dividend id', async () => {
            const fixture = await beforeDividendHubTest({
                issueSampleDividends: true,
            });
            const { receiver1, dividendHub } = fixture;

            await expectRevertWithModifierCustomError(
                dividendHub,
                dividendHub.connect(receiver1).getDividend(0),
                'InvalidDividendId'
            );
            await expectRevertWithModifierCustomError(
                dividendHub,
                dividendHub.connect(receiver1).getDividend(4),
                'InvalidDividendId'
            );
        });
    });

    /* --- Command --- */
    describe('1.4.3. issueDividend(address,uint256,uint256,address,string)', async () => {
        async function beforeIssueDividendTest(fixture: DividendHubFixture): Promise<{
            defaultParams: IssueDividendParams;
        }> {
            const { governor } = fixture;
            return {
                defaultParams: {
                    governor: governor.address,
                    tokenId: BigNumber.from(1),
                    value: ethers.utils.parseEther('1000'),
                    currency: ethers.constants.AddressZero,
                    note: 'Data_1',
                },
            };
        }

        it('1.4.3.1. Issue dividend successfully', async () => {
            const fixture = await beforeDividendHubTest();
            const { issuer1, issuer2, currencies, governor, dividendHub } = fixture;

            const tokenId1 = 1;
            const value1 = ethers.utils.parseEther('1000');
            const totalVote = await governor.totalSupply(tokenId1);

            let issuer1InitBalance = await ethers.provider.getBalance(issuer1.address);
            let dividendHubInitBalance = await ethers.provider.getBalance(dividendHub.address);

            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const params1 = {
                governor: governor.address,
                tokenId: BigNumber.from(tokenId1),
                value: value1,
                currency: ethers.constants.AddressZero,
                note: 'Data_1',
            };

            const tx1 = await getDividendTx_IssueDividend(dividendHub, issuer1, params1, {
                value: value1.add(ethers.utils.parseEther('1')),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1)
                .to.emit(dividendHub, 'NewDividend')
                .withArgs(
                    governor.address,
                    tokenId1,
                    issuer1.address,
                    totalVote,
                    value1,
                    ethers.constants.AddressZero,
                    params1.note
                );

            const dividend = await dividendHub.getDividend(tokenId1);
            expect(dividend.tokenId).to.equal(tokenId1);
            expect(dividend.remainWeight).to.equal(totalVote);
            expect(dividend.remainValue).to.equal(value1);
            expect(dividend.currency).to.equal(ethers.constants.AddressZero);
            expect(dividend.at(4)).to.equal(timestamp);
            expect(dividend.governor).to.equal(governor.address);

            expect(await ethers.provider.getBalance(issuer1.address)).to.equal(
                issuer1InitBalance.sub(gasFee1).sub(value1)
            );
            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(dividendHubInitBalance.add(value1));

            const tokenId2 = 2;
            const currency = currencies[0];
            const value2 = ethers.utils.parseEther('2000');
            const totalVote2 = await governor.totalSupply(tokenId2);

            let issuer2InitBalance = await currency.balanceOf(issuer2.address);
            dividendHubInitBalance = await currency.balanceOf(dividendHub.address);

            const params2 = {
                governor: governor.address,
                tokenId: BigNumber.from(tokenId2),
                value: value2,
                currency: currency.address,
                note: 'Data_2',
            };

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);
            const tx2 = await getDividendTx_IssueDividend(dividendHub, issuer2, params2);
            await tx2.wait();

            await expect(tx2)
                .to.emit(dividendHub, 'NewDividend')
                .withArgs(
                    governor.address,
                    tokenId2,
                    issuer2.address,
                    totalVote2,
                    value2,
                    currency.address,
                    params2.note
                );

            const dividend2 = await dividendHub.getDividend(tokenId2);
            expect(dividend2.tokenId).to.equal(tokenId2);
            expect(dividend2.remainWeight).to.equal(totalVote2);
            expect(dividend2.remainValue).to.equal(value2);
            expect(dividend2.currency).to.equal(currency.address);
            expect(dividend2.at(4)).to.equal(timestamp);
            expect(dividend2.governor).to.equal(governor.address);

            expect(await currency.balanceOf(issuer2.address)).to.equal(issuer2InitBalance.sub(value2));
            expect(await currency.balanceOf(dividendHub.address)).to.equal(dividendHubInitBalance.add(value2));
        });

        it('1.4.3.2. Issue dividend unsuccessfully when paused', async () => {
            const fixture = await beforeDividendHubTest({
                pause: true,
            });
            const { issuer1, dividendHub } = fixture;

            const { defaultParams } = await beforeIssueDividendTest(fixture);

            await expect(
                getDividendTx_IssueDividend(dividendHub, issuer1, defaultParams, {
                    value: defaultParams.value,
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.4.3.3. Issue dividend unsuccessfully with unauthorized governor', async () => {
            const fixture = await beforeDividendHubTest({
                skipAuthorizeGovernors: true,
            });
            const { issuer1, dividendHub } = fixture;

            const { defaultParams } = await beforeIssueDividendTest(fixture);

            await expect(
                getDividendTx_IssueDividend(dividendHub, issuer1, defaultParams, {
                    value: defaultParams.value,
                })
            ).to.be.revertedWithCustomError(dividendHub, 'Unauthorized');
        });

        it('1.4.3.4. Issue dividend unsuccessfully with invalid token id', async () => {
            const fixture = await beforeDividendHubTest();
            const { issuer1, dividendHub } = fixture;

            const { defaultParams } = await beforeIssueDividendTest(fixture);

            await expect(
                getDividendTx_IssueDividend(
                    dividendHub,
                    issuer1,
                    {
                        ...defaultParams,
                        tokenId: BigNumber.from(0),
                    },
                    { value: defaultParams.value }
                )
            ).to.be.revertedWithCustomError(dividendHub, 'InvalidTokenId');
        });

        it('1.4.3.5. Issue dividend unsuccessfully with unavailable currency', async () => {
            const fixture = await beforeDividendHubTest({
                skipRegisterCurrencies: true,
            });
            const { issuer1, dividendHub } = fixture;

            const { defaultParams } = await beforeIssueDividendTest(fixture);

            await expect(
                getDividendTx_IssueDividend(dividendHub, issuer1, defaultParams, {
                    value: defaultParams.value,
                })
            ).to.be.revertedWithCustomError(dividendHub, 'InvalidCurrency');
        });

        it('1.4.3.6. Issue dividend unsuccessfully with insufficient balance', async () => {
            const fixture = await beforeDividendHubTest();
            const { issuer1, dividendHub } = fixture;

            const { defaultParams } = await beforeIssueDividendTest(fixture);
            await expect(
                getDividendTx_IssueDividend(dividendHub, issuer1, defaultParams)
            ).to.be.revertedWithCustomError(dividendHub, 'InsufficientValue');
        });

        it('1.4.3.7. Issue dividend unsuccessfully with invalid value', async () => {
            const fixture = await beforeDividendHubTest();
            const { issuer1, dividendHub } = fixture;

            const { defaultParams } = await beforeIssueDividendTest(fixture);

            await expect(
                getDividendTx_IssueDividend(
                    dividendHub,
                    issuer1,
                    {
                        ...defaultParams,
                        value: BigNumber.from(0),
                    },
                    { value: defaultParams.value }
                )
            ).to.be.revertedWithCustomError(dividendHub, 'InvalidInput');
        });

        it('1.4.3.8. Issue dividend unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeDividendHubTest();
            const { issuer1, dividendHub } = fixture;

            const { defaultParams } = await beforeIssueDividendTest(fixture);

            await expect(
                getDividendTx_IssueDividend(dividendHub, issuer1, defaultParams, {
                    value: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(dividendHub, 'InsufficientValue');
        });

        it('1.4.3.9. Issue dividend unsuccessfully with insufficient erc20 token', async () => {
            const fixture = await beforeDividendHubTest({
                skipFundERC20ForIssuer: true,
            });
            const { issuer1, currencies, dividendHub } = fixture;

            const { defaultParams } = await beforeIssueDividendTest(fixture);

            await expect(
                getDividendTx_IssueDividend(dividendHub, issuer1, {
                    ...defaultParams,
                    currency: currencies[0].address,
                })
            ).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('1.4.3.10. Issue dividend unsuccessfully when receiving native token failed', async () => {
            const fixture = await beforeDividendHubTest();

            const { deployer, dividendHub } = fixture;

            const failReceiver = await deployFailReceiver(deployer.address, false, false);
            await prepareNativeToken(ethers.provider, deployer, [failReceiver], ethers.utils.parseEther('10000'));
            await callTransaction(failReceiver.activate(true));

            const { defaultParams } = await beforeIssueDividendTest(fixture);

            await expect(
                getCallDividendHubTx_IssueDividend(dividendHub, failReceiver as any, defaultParams, {
                    value: defaultParams.value.add(ethers.utils.parseEther('1')),
                })
            ).to.be.revertedWithCustomError(dividendHub, 'FailedRefund');
        });

        it('1.4.3.11. Issue dividend unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeDividendHubTest({
                useReentrancyERC20: true,
            });
            const { issuer1, governor, reentrancyERC20, dividendHub } = fixture;

            await callTransaction(
                reentrancyERC20.updateReentrancyPlan(
                    dividendHub.address,
                    dividendHub.interface.encodeFunctionData('issueDividend', [
                        governor.address,
                        1,
                        ethers.utils.parseEther('1000'),
                        reentrancyERC20.address,
                        'Data_1',
                    ])
                )
            );

            await expect(
                getDividendTx_IssueDividend(dividendHub, issuer1, {
                    governor: governor.address,
                    tokenId: BigNumber.from(2),
                    value: ethers.utils.parseEther('1000'),
                    currency: reentrancyERC20.address,
                    note: 'Data_2',
                })
            ).to.be.revertedWith('ReentrancyGuard: reentrant call');
        });
    });

    describe('1.4.4. withdraw(uint256[])', async () => {
        it('1.4.4.1. Withdraw successfully with multiple tx', async () => {
            const fixture = await beforeDividendHubTest({
                issueSampleDividends: true,
            });
            const { dividendHub, governor, receiver1, receiver2, receiver3, currencies } = fixture;

            const tokenId1 = 1;
            const dividendId1 = 1;
            const totalValue1 = (await dividendHub.getDividend(dividendId1)).remainValue;
            const totalWeight1 = (await dividendHub.getDividend(dividendId1)).remainWeight;
            const receiver1Weight1 = await governor.balanceOf(receiver1.address, tokenId1);
            const receiver2Weight1 = await governor.balanceOf(receiver2.address, tokenId1);
            const receiver3Weight1 = await governor.balanceOf(receiver3.address, tokenId1);
            const receiver1Value1 = receiver1Weight1.mul(totalValue1).div(totalWeight1);
            const receiver2Value1 = receiver2Weight1.mul(totalValue1).div(totalWeight1);
            const receiver3Value1 = receiver3Weight1.mul(totalValue1).div(totalWeight1);

            // Tx1: Receiver 1 withdraw dividend 1 (native token)
            let dividendHubInitBalance = await ethers.provider.getBalance(dividendHub.address);
            let receiver1InitBalance = await ethers.provider.getBalance(receiver1.address);

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const tx1 = await getWithdrawTx(receiver1, dividendHub, {
                dividendIds: [BigNumber.from(dividendId1)],
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            const event1 = receipt1.events!.find((e) => e.event === 'Withdrawal')!;
            expect(event1.args!.dividendId).to.equal(dividendId1);
            expect(event1.args!.withdrawer).to.equal(receiver1.address);
            expectEqualWithErrorMargin(event1.args!.value, receiver1Value1);

            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(
                dividendHubInitBalance.sub(receiver1Value1)
            );
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(
                receiver1InitBalance.add(receiver1Value1).sub(gasFee1)
            );

            let dividend = await dividendHub.getDividend(dividendId1);
            expect(dividend.remainWeight).to.equal(totalWeight1.sub(receiver1Weight1));
            expect(dividend.remainValue).to.equal(totalValue1.sub(receiver1Value1));

            expect(await dividendHub.withdrawAt(dividendId1, receiver1.address)).to.equal(timestamp);

            // Tx2: Receiver 2 withdraw dividend 1 (native token)
            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            dividendHubInitBalance = await ethers.provider.getBalance(dividendHub.address);
            let receiver2InitBalance = await ethers.provider.getBalance(receiver2.address);

            const tx2 = await getWithdrawTx(receiver2, dividendHub, {
                dividendIds: [BigNumber.from(dividendId1)],
            });
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            const event2 = receipt2.events!.find((e) => e.event === 'Withdrawal')!;
            expect(event2.args!.dividendId).to.equal(dividendId1);
            expect(event2.args!.withdrawer).to.equal(receiver2.address);
            expectEqualWithErrorMargin(event2.args!.value, receiver2Value1, ethers.utils.parseUnits('10', 'wei'));

            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(
                dividendHubInitBalance.sub(receiver2Value1)
            );
            expect(await ethers.provider.getBalance(receiver2.address)).to.equal(
                receiver2InitBalance.add(receiver2Value1).sub(gasFee2)
            );

            dividend = await dividendHub.getDividend(dividendId1);
            expect(dividend.remainWeight).to.equal(totalWeight1.sub(receiver1Weight1).sub(receiver2Weight1));
            expect(dividend.remainValue).to.equal(totalValue1.sub(receiver1Value1).sub(receiver2Value1));

            expect(await dividendHub.withdrawAt(dividendId1, receiver2.address)).to.equal(timestamp);

            // Tx3: Receiver 3 withdraw dividend 1 (native token)
            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            dividendHubInitBalance = await ethers.provider.getBalance(dividendHub.address);
            let receiver3InitBalance = await ethers.provider.getBalance(receiver3.address);

            const tx3 = await getWithdrawTx(receiver3, dividendHub, {
                dividendIds: [BigNumber.from(dividendId1)],
            });
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);

            const event3 = receipt3.events!.find((e) => e.event === 'Withdrawal')!;
            expect(event3.args!.dividendId).to.equal(dividendId1);
            expect(event3.args!.withdrawer).to.equal(receiver3.address);
            expectEqualWithErrorMargin(event3.args!.value, receiver3Value1, ethers.utils.parseUnits('10', 'wei'));

            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(
                dividendHubInitBalance.sub(receiver3Value1)
            );
            expect(await ethers.provider.getBalance(receiver3.address)).to.equal(
                receiver3InitBalance.add(receiver3Value1).sub(gasFee3)
            );

            dividend = await dividendHub.getDividend(dividendId1);
            expect(dividend.remainWeight).to.equal(0);
            expect(dividend.remainValue).to.equal(0);

            expect(await dividendHub.withdrawAt(dividendId1, receiver3.address)).to.equal(timestamp);

            // Tx4: Receiver 1 withdraw dividend 2 (native token)
            const tokenId2 = 1;
            const dividendId2 = 2;
            const totalValue2 = (await dividendHub.getDividend(dividendId2)).remainValue;
            const totalWeight2 = (await dividendHub.getDividend(dividendId2)).remainWeight;
            const receiver1Weight2 = await governor.balanceOf(receiver1.address, tokenId2);
            const receiver1Value2 = receiver1Weight2.mul(totalValue2).div(totalWeight2);

            dividendHubInitBalance = await ethers.provider.getBalance(dividendHub.address);
            receiver1InitBalance = await ethers.provider.getBalance(receiver1.address);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tx4 = await getWithdrawTx(receiver1, dividendHub, {
                dividendIds: [BigNumber.from(dividendId2)],
            });
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.gasUsed.mul(receipt4.effectiveGasPrice);

            const event4 = receipt4.events!.find((e) => e.event === 'Withdrawal')!;
            expect(event4.args!.dividendId).to.equal(dividendId2);
            expect(event4.args!.withdrawer).to.equal(receiver1.address);
            expectEqualWithErrorMargin(event4.args!.value, receiver1Value2, ethers.utils.parseUnits('10', 'wei'));

            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(
                dividendHubInitBalance.sub(receiver1Value2)
            );
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(
                receiver1InitBalance.add(receiver1Value2).sub(gasFee4)
            );

            dividend = await dividendHub.getDividend(dividendId2);
            expect(dividend.remainWeight).to.equal(totalWeight2.sub(receiver1Weight2));
            expect(dividend.remainValue).to.equal(totalValue2.sub(receiver1Value2));

            expect(await dividendHub.withdrawAt(dividendId2, receiver1.address)).to.equal(timestamp);

            // Tx5: Receiver 2 withdraw dividend 3 (erc20 token)
            const currency = currencies[0];
            const tokenId3 = 2;
            const dividendId3 = 3;
            const totalValue3 = (await dividendHub.getDividend(dividendId3)).remainValue;
            const totalWeight3 = (await dividendHub.getDividend(dividendId3)).remainWeight;
            const receiver2Weight3 = await governor.balanceOf(receiver2.address, tokenId3);
            const receiver2Value3 = receiver2Weight3.mul(totalValue3).div(totalWeight3);

            dividendHubInitBalance = await currency.balanceOf(dividendHub.address);
            receiver2InitBalance = await currency.balanceOf(receiver2.address);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tx5 = await getWithdrawTx(receiver2, dividendHub, {
                dividendIds: [BigNumber.from(dividendId3)],
            });
            const receipt5 = await tx5.wait();

            const event5 = receipt5.events!.find((e) => e.event === 'Withdrawal')!;
            expect(event5.args!.dividendId).to.equal(dividendId3);
            expect(event5.args!.withdrawer).to.equal(receiver2.address);
            expectEqualWithErrorMargin(event5.args!.value, receiver2Value3, ethers.utils.parseUnits('10', 'wei'));

            expect(await currency.balanceOf(dividendHub.address)).to.equal(dividendHubInitBalance.sub(receiver2Value3));
            expect(await currency.balanceOf(receiver2.address)).to.equal(receiver2InitBalance.add(receiver2Value3));

            dividend = await dividendHub.getDividend(dividendId3);
            expect(dividend.remainWeight).to.equal(totalWeight3.sub(receiver2Weight3));
            expect(dividend.remainValue).to.equal(totalValue3.sub(receiver2Value3));

            expect(await dividendHub.withdrawAt(dividendId3, receiver2.address)).to.equal(timestamp);
        });

        it('1.4.4.2. Withdraw successfully with multiple dividend ids', async () => {
            const fixture = await beforeDividendHubTest({
                issueSampleDividends: true,
            });
            const { dividendHub, governor, receiver1, currencies } = fixture;

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            // Tx1: Receiver 1 withdraw dividend 1, 2 (native token) and 3 (erc20 token)
            let dividendHubInitNativeBalance = await ethers.provider.getBalance(dividendHub.address);
            let receiver1InitNativeBalance = await ethers.provider.getBalance(receiver1.address);
            let dividendHubInitERC20Balance = await currencies[0].balanceOf(dividendHub.address);
            let receiver1InitERC20Balance = await currencies[0].balanceOf(receiver1.address);

            const tokenId1 = 1;
            const dividendId1 = 1;
            const totalValue1 = (await dividendHub.getDividend(dividendId1)).remainValue;
            const totalWeight1 = (await dividendHub.getDividend(dividendId1)).remainWeight;
            const receiver1Weight1 = await governor.balanceOf(receiver1.address, tokenId1);
            const receiver1Value1 = receiver1Weight1.mul(totalValue1).div(totalWeight1);

            const tokenId2 = 1;
            const dividendId2 = 2;
            const totalValue2 = (await dividendHub.getDividend(dividendId2)).remainValue;
            const totalWeight2 = (await dividendHub.getDividend(dividendId2)).remainWeight;
            const receiver1Weight2 = await governor.balanceOf(receiver1.address, tokenId2);
            const receiver1Value2 = receiver1Weight2.mul(totalValue2).div(totalWeight2);

            const currency = currencies[0];
            const tokenId3 = 2;
            const dividendId3 = 3;
            const totalValue3 = (await dividendHub.getDividend(dividendId3)).remainValue;
            const totalWeight3 = (await dividendHub.getDividend(dividendId3)).remainWeight;
            const receiver1Weight3 = await governor.balanceOf(receiver1.address, tokenId3);
            const receiver1Value3 = receiver1Weight3.mul(totalValue3).div(totalWeight3);

            const tx = await getWithdrawTx(receiver1, dividendHub, {
                dividendIds: [BigNumber.from(dividendId1), BigNumber.from(dividendId2), BigNumber.from(dividendId3)],
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            const events = receipt.events!.filter((e) => e.event === 'Withdrawal');

            expect(events[0].args!.dividendId).to.equal(dividendId1);
            expect(events[0].args!.withdrawer).to.equal(receiver1.address);
            expectEqualWithErrorMargin(events[0].args!.value, receiver1Value1);

            expect(events[1].args!.dividendId).to.equal(dividendId2);
            expect(events[1].args!.withdrawer).to.equal(receiver1.address);
            expectEqualWithErrorMargin(events[1].args!.value, receiver1Value2);

            expect(events[2].args!.dividendId).to.equal(dividendId3);
            expect(events[2].args!.withdrawer).to.equal(receiver1.address);
            expectEqualWithErrorMargin(events[2].args!.value, receiver1Value3);

            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(
                dividendHubInitNativeBalance.sub(receiver1Value1).sub(receiver1Value2)
            );
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(
                receiver1InitNativeBalance.add(receiver1Value1).add(receiver1Value2).sub(gasFee)
            );
            expect(await currency.balanceOf(dividendHub.address)).to.equal(
                dividendHubInitERC20Balance.sub(receiver1Value3)
            );
            expect(await currency.balanceOf(receiver1.address)).to.equal(
                receiver1InitERC20Balance.add(receiver1Value3)
            );

            const dividend1 = await dividendHub.getDividend(dividendId1);
            expect(dividend1.remainWeight).to.equal(totalWeight1.sub(receiver1Weight1));
            expect(dividend1.remainValue).to.equal(totalValue1.sub(receiver1Value1));

            const dividend2 = await dividendHub.getDividend(dividendId2);
            expect(dividend2.remainWeight).to.equal(totalWeight2.sub(receiver1Weight2));
            expect(dividend2.remainValue).to.equal(totalValue2.sub(receiver1Value2));

            const dividend3 = await dividendHub.getDividend(dividendId3);
            expect(dividend3.remainWeight).to.equal(totalWeight3.sub(receiver1Weight3));
            expect(dividend3.remainValue).to.equal(totalValue3.sub(receiver1Value3));

            expect(await dividendHub.withdrawAt(dividendId1, receiver1.address)).to.equal(timestamp);
            expect(await dividendHub.withdrawAt(dividendId2, receiver1.address)).to.equal(timestamp);
            expect(await dividendHub.withdrawAt(dividendId3, receiver1.address)).to.equal(timestamp);
        });

        it('1.4.4.3. Withdraw unsuccessfully when paused', async () => {
            const fixture = await beforeDividendHubTest({
                issueSampleDividends: true,
                pause: true,
            });
            const { dividendHub, receiver1 } = fixture;

            await expect(
                getWithdrawTx(receiver1, dividendHub, {
                    dividendIds: [BigNumber.from(1)],
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.4.4.4. Withdraw unsuccessfully with invalid dividend id', async () => {
            const fixture = await beforeDividendHubTest({
                issueSampleDividends: true,
            });
            const { dividendHub, receiver1 } = fixture;

            await expect(
                getWithdrawTx(receiver1, dividendHub, {
                    dividendIds: [BigNumber.from(0)],
                })
            ).to.be.revertedWithCustomError(dividendHub, 'InvalidDividendId');

            await expect(
                getWithdrawTx(receiver1, dividendHub, {
                    dividendIds: [BigNumber.from(4)],
                })
            ).to.be.revertedWithCustomError(dividendHub, 'InvalidDividendId');
        });

        it('1.4.4.5. Withdraw unsuccessfully when withdrawing the same dividend id in the same tx', async () => {
            const fixture = await beforeDividendHubTest({
                issueSampleDividends: true,
            });
            const { dividendHub, receiver1 } = fixture;

            await expect(
                getWithdrawTx(receiver1, dividendHub, {
                    dividendIds: [BigNumber.from(1), BigNumber.from(2), BigNumber.from(1)],
                })
            ).to.be.revertedWithCustomError(dividendHub, 'AlreadyWithdrawn');
        });

        it('1.4.4.6. Withdraw unsuccessfully when withdrawing the same dividend id in different txs', async () => {
            const fixture = await beforeDividendHubTest({
                issueSampleDividends: true,
            });
            const { dividendHub, receiver1 } = fixture;

            await callTransaction(
                getWithdrawTx(receiver1, dividendHub, {
                    dividendIds: [BigNumber.from(1)],
                })
            );

            await expect(
                getWithdrawTx(receiver1, dividendHub, {
                    dividendIds: [BigNumber.from(1)],
                })
            ).to.be.revertedWithCustomError(dividendHub, 'AlreadyWithdrawn');
        });

        it('1.4.4.7. Withdraw unsuccessfully with zero weight', async () => {
            const fixture = await beforeDividendHubTest({
                issueSampleDividends: true,
            });
            const { dividendHub, receiver3 } = fixture;

            await expect(
                getWithdrawTx(receiver3, dividendHub, {
                    dividendIds: [BigNumber.from(3)],
                })
            ).to.be.revertedWithCustomError(dividendHub, 'InvalidWithdrawing');
        });

        it('1.4.4.8. Withdraw unsuccessfully with insufficient remaining funds', async () => {
            const fixture = await beforeDividendHubTest();

            const { governor, issuer1, dividendHub, receiver1 } = fixture;

            const timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            governor.totalEquityAt.whenCalledWith(1, timestamp).returns(ethers.utils.parseEther('1'));
            governor.totalEquityAt.whenCalledWith(2, timestamp).returns(ethers.utils.parseEther('1'));

            await callTransaction(
                getDividendTx_IssueDividend(
                    dividendHub,
                    issuer1,
                    {
                        governor: governor.address,
                        tokenId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1000'),
                        currency: ethers.constants.AddressZero,
                        note: 'Data_1',
                    },
                    { value: ethers.utils.parseEther('1000') }
                )
            );

            governor.totalEquityAt.reset();

            await expect(
                getWithdrawTx(receiver1, dividendHub, {
                    dividendIds: [BigNumber.from(1)],
                })
            ).to.be.revertedWithCustomError(dividendHub, 'InsufficientFunds');
        });

        it('1.4.4.9. Withdraw unsuccessfully when receiving native token failed', async () => {
            const fixture = await beforeDividendHubTest({
                useFailReceiver: true,
            });

            const { governor, issuer1, dividendHub, failReceiver } = fixture;

            await callTransaction(
                getDividendTx_IssueDividend(
                    dividendHub,
                    issuer1,
                    {
                        governor: governor.address,
                        tokenId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1000'),
                        currency: ethers.constants.AddressZero,
                        note: 'Data_1',
                    },
                    { value: ethers.utils.parseEther('1000') }
                )
            );

            await callTransaction(failReceiver.activate(true));

            await expect(
                failReceiver.call(dividendHub.address, dividendHub.interface.encodeFunctionData('withdraw', [[1]]))
            ).to.be.revertedWithCustomError(dividendHub, 'FailedTransfer');
        });

        it('1.4.4.10. Withdraw unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeDividendHubTest({
                useReentrancyERC20: true,
            });
            const { dividendHub, issuer1, governor, reentrancyERC20, receiver1 } = fixture;

            await callTransaction(
                getDividendTx_IssueDividend(dividendHub, issuer1, {
                    governor: governor.address,
                    tokenId: BigNumber.from(2),
                    value: ethers.utils.parseEther('1000'),
                    currency: reentrancyERC20.address,
                    note: 'Data_2',
                })
            );

            await callTransaction(
                reentrancyERC20.updateReentrancyPlan(
                    dividendHub.address,
                    dividendHub.interface.encodeFunctionData('withdraw', [[1]])
                )
            );

            await expect(
                getWithdrawTx(receiver1, dividendHub, {
                    dividendIds: [BigNumber.from(1)],
                })
            ).to.be.revertedWith('ReentrancyGuard: reentrant call');
        });
    });
});
