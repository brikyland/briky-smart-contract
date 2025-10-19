import { BigNumber, Contract } from 'ethers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import { Constant } from '@tests/test.constant';

// @tests/common
import { Initialization as CommonInitialization } from '@tests/common/test.initialization';

// @typechain-types
import {
    Admin,
    Currency,
    GovernanceHub,
    Governor,
    Governor__factory,
    FailReceiver,
    ReentrancyERC20,
    ReentrancyReceiver,
} from '@typechain-types';

// @utils
import {
    callTransaction,
    expectRevertWithModifierCustomError,
    prepareERC20,
    prepareNativeToken,
    testReentrancy,
} from '@utils/blockchain';
import { scale } from '@utils/formula';
import { MockValidator } from '@utils/mockValidator';

// @utils/models/common
import {
    AdmitParamsInput,
    ConcludeExecutionParamsInput,
    ContributeBudgetParams,
    DisqualifyParamsInput,
    LogExecutionParamsInput,
    ProposalState,
    ProposalRule,
    ProposalVerdict,
    ProposalVoteOption,
    UpdateFeeParams,
    UpdateFeeParamsInput,
    VoteParams,
} from '@utils/models/common/governanceHub';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';
import { deployReentrancyReceiver } from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/models/common
import {
    AdmitParams,
    DisqualifyParams,
    LogExecutionParams,
    ConcludeExecutionParams,
    ProposeParamsInput,
} from '@utils/models/common/governanceHub';

// @utils/signatures/common
import { getUpdateFeeSignatures } from '@utils/signatures/common/governanceHub';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeGovernors,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
} from '@utils/transaction/common/admin';
import {
    getGovernanceHubTx_Admit,
    getGovernanceHubTx_Propose,
    getGovernanceHubTxByInput_Propose,
    getCallGovernanceHubTxByInput_Propose,
    getGovernanceHubTxByInput_Admit,
    getGovernanceHubTx_ConcludeExecution,
    getGovernanceHubTxByInput_ConcludeExecution,
    getGovernanceHubTx_Confirm,
    getGovernanceHubTx_ContributeBudget,
    getGovernanceHubTx_Disqualify,
    getGovernanceHubTxByInput_Disqualify,
    getGovernanceHubTx_LogExecution,
    getGovernanceHubTxByInput_LogExecution,
    getGovernanceHubTx_RejectExecution,
    getGovernanceHubTx_SafeContributeBudget,
    getGovernanceHubTxByInput_SafeContributeBudget,
    getGovernanceHubTx_Vote,
    getGovernanceHubTxByParams_SafeVote,
    getGovernanceHubTx_UpdateFee,
    getGovernanceHubTxByInput_UpdateFee,
    getGovernanceHubTx_WithdrawBudgetContribution,
    getGovernanceHubTx_SafeVote,
} from '@utils/transaction/common/governanceHub';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/validation/common
import {
    getProposeValidation,
    getAdmitValidation,
    getDisqualifyValidation,
    getLogExecutionValidation,
    getConcludeExecutionValidation,
} from '@utils/validation/common/governanceHub';

export interface GovernanceHubFixture {
    deployer: any;
    admins: any[];
    proposer1: any;
    proposer2: any;
    operator1: any;
    operator2: any;
    contributor1: any;
    contributor2: any;
    voter1: any;
    voter2: any;
    voter3: any;
    custodian1: any;
    custodian2: any;
    manager: any;
    moderator: any;

    validator: MockValidator;

    admin: Admin;
    currencies: Currency[];
    governor: MockContract<Governor>;
    governanceHub: GovernanceHub;

    zone: any;
    failReceiver: FailReceiver;
    reentrancyERC20: ReentrancyERC20;
}

async function testReentrancy_GovernanceHub(
    fixture: GovernanceHubFixture,
    reentrancyContract: Contract,
    assertion: any
) {
    const { proposer2, governor, operator2, governanceHub, validator } = fixture;

    let timestamp = (await time.latest()) + 10;
    const proposeParams = {
        governor: governor.address,
        tokenId: ethers.BigNumber.from(2),
        operator: operator2.address,
        uuid: ethers.utils.formatBytes32String('uuid_2'),
        rule: ProposalRule.DisapprovalBeyondQuorum,
        quorumRate: ethers.utils.parseEther('0.4'),
        duration: 3000,
        admissionExpiry: timestamp + 4000,
    };
    const proposeValidation = await getProposeValidation(governanceHub, proposeParams, validator, proposer2);

    let data = [
        governanceHub.interface.encodeFunctionData('propose', [
            proposeParams.governor,
            proposeParams.tokenId,
            proposeParams.operator,
            proposeParams.uuid,
            proposeParams.rule,
            proposeParams.quorumRate,
            proposeParams.duration,
            proposeParams.admissionExpiry,
            proposeValidation,
        ]),
        governanceHub.interface.encodeFunctionData('withdrawBudgetContribution', [1]),
        governanceHub.interface.encodeFunctionData('confirm', [1]),
    ];

    await testReentrancy(reentrancyContract, governanceHub, data, assertion);
}

describe('1.6. GovernanceHub', async () => {
    afterEach(async () => {
        const fixture = await loadFixture(governanceHubFixture);
        const { governor } = fixture;
        governor.isAvailable.reset();
        governor.totalEquityAt.reset();
        governor.equityOfAt.reset();
    });

    async function governanceHubFixture(): Promise<GovernanceHubFixture> {
        const [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            validatorWallet,
            proposer1,
            proposer2,
            operator1,
            operator2,
            contributor1,
            contributor2,
            voter1,
            voter2,
            voter3,
            custodian1,
            custodian2,
            manager,
            moderator,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const validator = new MockValidator(validatorWallet as any);

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const currency1 = (await deployCurrency(deployer.address, 'MockCurrency1', 'MC1')) as Currency;
        const currency2 = (await deployCurrency(deployer.address, 'MockCurrency2', 'MC2')) as Currency;
        const currencies = [currency1, currency2];

        const SmockGovernor = await smock.mock<Governor__factory>('Governor');
        const governor = await SmockGovernor.deploy();
        await governor.initialize(admin.address);

        const governanceHub = (await deployGovernanceHub(
            deployer,
            admin.address,
            validator.getAddress(),
            CommonInitialization.GOVERNANCE_HUB_Fee
        )) as GovernanceHub;

        const zone = ethers.utils.formatBytes32String('TestZone');
        const failReceiver = (await deployFailReceiver(deployer.address, false, false)) as FailReceiver;
        const reentrancyERC20 = (await deployReentrancyERC20(deployer.address, true, false)) as ReentrancyERC20;

        return {
            deployer,
            admins,
            proposer1,
            proposer2,
            operator1,
            operator2,
            contributor1,
            contributor2,
            voter1,
            voter2,
            voter3,
            custodian1,
            custodian2,
            manager,
            moderator,
            validator,
            admin,
            currencies,
            governor,
            governanceHub,
            zone,
            failReceiver,
            reentrancyERC20,
        };
    }

    async function beforeGovernanceHubTest({
        skipDeclareZone = false,
        skipListGovernorTokens = false,
        addSampleProposals = false,
        admitSampleProposals = false,
        disqualifySampleProposals = false,
        voteApprovalSampleProposals = false,
        voteDisapprovalSampleProposals = false,
        contributeBudgetSampleProposals = false,
        confirmExecutionSampleProposals = false,
        rejectExecutionSampleProposals = false,
        concludeExecutionSucceededSampleProposals = false,
        concludeExecutionFailedSampleProposals = false,
        useFailReceiverContributor = false,
        useFailReceiverOperator = false,
        useReentrancyERC20 = false,
        pause = false,
    } = {}): Promise<GovernanceHubFixture> {
        const fixture = await loadFixture(governanceHubFixture);
        const {
            deployer,
            admins,
            contributor1,
            contributor2,
            voter1,
            voter2,
            voter3,
            proposer1,
            proposer2,
            operator1,
            operator2,
            custodian1,
            custodian2,
            manager,
            moderator,
            validator,
            admin,
            currencies,
            governanceHub,
            governor,
            zone,
            failReceiver,
            reentrancyERC20,
        } = fixture;
        const fee = await governanceHub.fee();

        await callTransaction(
            getAdminTxByInput_AuthorizeManagers(
                admin,
                deployer,
                {
                    accounts: [manager.address],
                    isManager: true,
                },
                admins
            )
        );
        await callTransaction(
            getAdminTxByInput_AuthorizeModerators(
                admin,
                deployer,
                {
                    accounts: [moderator.address],
                    isModerator: true,
                },
                admins
            )
        );
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

        if (!skipDeclareZone) {
            await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone,
                        accounts: [manager.address, moderator.address, operator1.address, operator2.address],
                        isActive: true,
                    },
                    admins
                )
            );
        }

        let timestamp = (await time.latest()) + 10;

        if (!skipListGovernorTokens) {
            await callTransaction(governor.setZone(1, zone));
            await callTransaction(governor.setCustodian(1, custodian1.address));
            await callTransaction(governor.connect(voter1).mint(1, ethers.utils.parseEther('2')));
            await callTransaction(governor.connect(voter2).mint(1, ethers.utils.parseEther('3')));
            await callTransaction(governor.connect(voter3).mint(1, ethers.utils.parseEther('5')));

            await callTransaction(governor.setZone(2, zone));
            await callTransaction(governor.setCustodian(2, custodian2.address));
            await callTransaction(governor.connect(voter1).mint(2, ethers.utils.parseEther('100')));
            await callTransaction(governor.connect(voter2).mint(2, ethers.utils.parseEther('300')));
        }

        if (addSampleProposals) {
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(
                getGovernanceHubTxByInput_Propose(
                    governanceHub,
                    proposer1,
                    {
                        governor: governor.address,
                        tokenId: ethers.BigNumber.from(1),
                        operator: useFailReceiverOperator ? failReceiver.address : operator1.address,
                        uuid: ethers.utils.formatBytes32String('uuid_1'),
                        rule: ProposalRule.ApprovalBeyondQuorum,
                        quorumRate: ethers.utils.parseEther('0.7'),
                        duration: 1000,
                        admissionExpiry: timestamp + 2000,
                    },
                    validator,
                    { value: fee }
                )
            );

            timestamp += 10;

            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(
                getGovernanceHubTxByInput_Propose(
                    governanceHub,
                    proposer2,
                    {
                        governor: governor.address,
                        tokenId: ethers.BigNumber.from(2),
                        operator: operator2.address,
                        uuid: ethers.utils.formatBytes32String('uuid_2'),
                        rule: ProposalRule.DisapprovalBeyondQuorum,
                        quorumRate: ethers.utils.parseEther('0.75'),
                        duration: 3000,
                        admissionExpiry: timestamp + 4000,
                    },
                    validator,
                    { value: fee }
                )
            );
        }

        if (admitSampleProposals) {
            await callTransaction(
                getGovernanceHubTxByInput_Admit(
                    governanceHub,
                    custodian1,
                    {
                        proposalId: BigNumber.from(1),
                        contextURI: 'metadata_uri_1',
                        reviewURI: 'state_uri_1',
                        currency: ethers.constants.AddressZero,
                    },
                    validator
                )
            );

            await callTransaction(
                getGovernanceHubTxByInput_Admit(
                    governanceHub,
                    custodian2,
                    {
                        proposalId: BigNumber.from(2),
                        contextURI: 'metadata_uri_2',
                        reviewURI: 'state_uri_2',
                        currency: useReentrancyERC20 ? reentrancyERC20.address : currencies[0].address,
                    },
                    validator
                )
            );
        }

        if (disqualifySampleProposals) {
            await callTransaction(
                getGovernanceHubTxByInput_Disqualify(
                    governanceHub,
                    manager,
                    {
                        proposalId: BigNumber.from(1),
                        contextURI: 'metadata_uri_1',
                        reviewURI: 'state_uri_1',
                    },
                    validator
                )
            );

            await callTransaction(
                getGovernanceHubTxByInput_Disqualify(
                    governanceHub,
                    manager,
                    {
                        proposalId: BigNumber.from(2),
                        contextURI: 'metadata_uri_2',
                        reviewURI: 'state_uri_2',
                    },
                    validator
                )
            );
        }

        await prepareERC20(
            currencies[0],
            [contributor1, contributor2],
            [governanceHub],
            ethers.utils.parseEther(String(1e9))
        );

        await prepareNativeToken(ethers.provider, deployer, [failReceiver], ethers.utils.parseEther('10000'));

        if (voteApprovalSampleProposals) {
            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            );

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
        }

        if (voteDisapprovalSampleProposals) {
            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
        }

        if (contributeBudgetSampleProposals) {
            if (useFailReceiverContributor) {
                await callTransaction(
                    failReceiver.call(
                        governanceHub.address,
                        governanceHub.interface.encodeFunctionData('contributeBudget', [
                            1,
                            ethers.utils.parseEther('100'),
                        ]),
                        { value: ethers.utils.parseEther('100') }
                    )
                );
            } else {
                await callTransaction(
                    governanceHub.connect(contributor1).contributeBudget(1, ethers.utils.parseEther('100'), {
                        value: ethers.utils.parseEther('100'),
                    })
                );
            }

            await callTransaction(
                governanceHub.connect(contributor2).contributeBudget(2, ethers.utils.parseEther('200'))
            );
        }

        if (confirmExecutionSampleProposals) {
            timestamp = (await governanceHub.getProposal(1)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            );

            timestamp = (await governanceHub.getProposal(2)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(2),
                })
            );
        }

        if (rejectExecutionSampleProposals) {
            timestamp = (await governanceHub.getProposal(1)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            );

            timestamp = (await governanceHub.getProposal(2)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(
                getGovernanceHubTx_RejectExecution(governanceHub, operator2, {
                    proposalId: BigNumber.from(2),
                })
            );
        }

        if (concludeExecutionSucceededSampleProposals) {
            await callTransaction(
                getGovernanceHubTxByInput_ConcludeExecution(
                    governanceHub,
                    custodian1,
                    {
                        proposalId: BigNumber.from(1),
                        logURI: 'state_uri_1',
                        isSuccessful: true,
                    },
                    validator
                )
            );

            await callTransaction(
                getGovernanceHubTxByInput_ConcludeExecution(
                    governanceHub,
                    custodian2,
                    {
                        proposalId: BigNumber.from(2),
                        logURI: 'state_uri_2',
                        isSuccessful: true,
                    },
                    validator
                )
            );
        }

        if (concludeExecutionFailedSampleProposals) {
            await callTransaction(
                getGovernanceHubTxByInput_ConcludeExecution(
                    governanceHub,
                    custodian1,
                    {
                        proposalId: BigNumber.from(1),
                        logURI: 'state_uri_1',
                        isSuccessful: false,
                    },
                    validator
                )
            );

            await callTransaction(
                getGovernanceHubTxByInput_ConcludeExecution(
                    governanceHub,
                    custodian2,
                    {
                        proposalId: BigNumber.from(2),
                        logURI: 'state_uri_2',
                        isSuccessful: false,
                    },
                    validator
                )
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(governanceHub, deployer, admin, admins));
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('1.6.1. initialize(address,address,uint256)', async () => {
        it('1.6.1.1. Init validator successfully after deployment', async () => {
            const { validator, admin, governanceHub } = await beforeGovernanceHubTest();

            const tx = governanceHub.deployTransaction;
            await expect(tx).to.emit(governanceHub, 'FeeUpdate').withArgs(CommonInitialization.GOVERNANCE_HUB_Fee);

            expect(await governanceHub.admin()).to.equal(admin.address);
            expect(await governanceHub.validator()).to.equal(validator.getAddress());
            expect(await governanceHub.fee()).to.equal(CommonInitialization.GOVERNANCE_HUB_Fee);
        });
    });

    /* --- Administration --- */
    describe('1.6.2. updateFee(uint256,bytes[])', async () => {
        it('1.6.2.1. Update fee successfully with valid signatures', async () => {
            const { deployer, admins, admin, governanceHub } = await beforeGovernanceHubTest();

            const newFee = (await governanceHub.fee()).add(ethers.utils.parseEther('1'));

            const paramsInput: UpdateFeeParamsInput = {
                fee: newFee,
            };

            const tx = await getGovernanceHubTxByInput_UpdateFee(governanceHub, deployer, paramsInput, admin, admins);
            await tx.wait();

            await expect(tx).to.emit(governanceHub, 'FeeUpdate').withArgs(newFee);

            expect(await governanceHub.fee()).to.equal(newFee);
        });

        it('1.6.2.2. Update fee unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, governanceHub } = await beforeGovernanceHubTest();

            const newFee = (await governanceHub.fee()).add(ethers.utils.parseEther('1'));

            const paramsInput: UpdateFeeParamsInput = {
                fee: newFee,
            };
            const params: UpdateFeeParams = {
                ...paramsInput,
                signatures: await getUpdateFeeSignatures(governanceHub, paramsInput, admin, admins, false),
            };
            await expect(getGovernanceHubTx_UpdateFee(governanceHub, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });
    });

    /* --- Query --- */
    describe('1.6.3. getProposal(uint256)', async () => {
        it('1.6.3.1. Return correct proposal', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { operator1, proposer1, validator, governanceHub, governor } = fixture;

            let timestamp = (await time.latest()) + 10;

            const fee = await governanceHub.fee();
            const paramsInput: ProposeParamsInput = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String('uuid_1'),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther('0.7'),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            };
            await callTransaction(
                getGovernanceHubTxByInput_Propose(governanceHub, proposer1, paramsInput, validator, { value: fee })
            );

            const proposal = await governanceHub.getProposal(1);
            expect(proposal.uuid).to.equal(paramsInput.uuid);
            expect(proposal.contextURI).to.equal('');
            expect(proposal.logURI).to.equal('');
            expect(proposal.governor).to.equal(paramsInput.governor);
            expect(proposal.tokenId).to.equal(paramsInput.tokenId);
            expect(proposal.totalWeight).to.equal(0);
            expect(proposal.approvalWeight).to.equal(0);
            expect(proposal.disapprovalWeight).to.equal(0);
            expect(proposal.quorum).to.equal(paramsInput.quorumRate);
            expect(proposal.proposer).to.equal(proposer1.address);
            expect(proposal.operator).to.equal(paramsInput.operator);
            expect(proposal.timePivot).to.equal(paramsInput.admissionExpiry);
            expect(proposal.due).to.equal(paramsInput.duration);
            expect(proposal.rule).to.equal(paramsInput.rule);
            expect(proposal.state).to.equal(ProposalState.Pending);
            expect(proposal.budget).to.equal(0);
            expect(proposal.currency).to.equal(ethers.constants.AddressZero);
        });

        it('1.6.3.2. Revert with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub } = fixture;

            await expectRevertWithModifierCustomError(governanceHub, governanceHub.getProposal(0), 'InvalidProposalId');

            await expectRevertWithModifierCustomError(
                governanceHub,
                governanceHub.getProposal(100),
                'InvalidProposalId'
            );
        });
    });

    describe('1.6.4. getProposalState(uint256)', async () => {
        it('1.6.4.1. Return disqualified state with proposal overdue for confirmation', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
            });
            const { governanceHub } = fixture;

            const proposal = await governanceHub.getProposal(1);
            const due = proposal.due;
            await time.increaseTo(due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT);
            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Disqualified);

            await time.increaseTo(due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT + 10);
            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Disqualified);
        });

        it('1.6.4.2. Return correct proposal state for pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Pending);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Pending);
        });

        it('1.6.4.3. Return correct proposal state for voting proposal that is not overdue for confirmation', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Voting);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Voting);
        });

        it('1.6.4.4. Return correct proposal state for executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Executing);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Executing);
        });

        it('1.6.4.5. Return correct proposal state for successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.SuccessfulExecuted);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.SuccessfulExecuted);
        });

        it('1.6.4.6. Return correct proposal state for unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.UnsuccessfulExecuted);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.UnsuccessfulExecuted);
        });

        it('1.6.4.7. Return correct proposal state for disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Disqualified);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Disqualified);
        });

        it('1.6.4.8. Return correct proposal state for rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Rejected);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Rejected);
        });

        it('1.6.4.9. Revert with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub } = fixture;

            await expect(governanceHub.getProposalState(0)).to.be.revertedWithCustomError(
                governanceHub,
                'InvalidProposalId'
            );
            await expect(governanceHub.getProposalState(100)).to.be.revertedWithCustomError(
                governanceHub,
                'InvalidProposalId'
            );
        });
    });

    describe('1.6.5. getProposalVerdict(uint256)', async () => {
        it('1.6.5.1. Return unsettled verdict for pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Unsettled);
        });

        it('1.6.5.2. Return passed verdict for executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.5.3. Return passed verdict for successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.5.4. Return passed verdict for unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.5.5. Return failed verdict for disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.5.6. Return failed verdict for rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.5.7. Return passed verdict with enough approval votes for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2, voter3 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.5.8. Return failed verdict with enough disapproval votes for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2, voter3 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.5.9. Return failed verdict with not enough approval votes after due for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );

            const due = (await governanceHub.getProposal(1)).due;
            await time.increaseTo(due);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.5.10. Return unsettled verdict with not enough approval votes before due for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);
        });

        it('1.6.5.11. Return failed verdict with enough disapproval votes for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.5.12. Return passed verdict with enough approval votes for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            );
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.5.13. Return failed verdict with not enough disapproval votes after due for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );

            const due = (await governanceHub.getProposal(2)).due;
            await time.increaseTo(due);

            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.5.14. Return unsettled verdict with not enough disapproval votes before due for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            );

            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Unsettled);
        });

        it('1.6.5.15. Revert with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub } = fixture;

            await expect(governanceHub.getProposalVerdict(0)).to.be.revertedWithCustomError(
                governanceHub,
                'InvalidProposalId'
            );
            await expect(governanceHub.getProposalVerdict(100)).to.be.revertedWithCustomError(
                governanceHub,
                'InvalidProposalId'
            );
        });
    });

    /* --- Command --- */
    describe('1.6.6. propose(address,uint256,address,bytes32,uint8,uint256,uint40,uint40,(uint256,uint256,bytes))', async () => {
        async function beforeProposeTest(
            fixture: GovernanceHubFixture
        ): Promise<{ defaultParams: ProposeParamsInput }> {
            let timestamp = (await time.latest()) + 10;
            const { governor, operator1 } = fixture;
            const defaultParams = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String('uuid_1'),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther('0.7'),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            };
            return { defaultParams };
        }

        it('1.6.6.1. Propose successfully with valid validation', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, governor, operator1, operator2, proposer1, proposer2, validator } = fixture;

            const fee = await governanceHub.fee();
            let timestamp = (await time.latest()) + 10;

            // Tx1: Send just enough for the fee
            let proposer1InitBalance = await ethers.provider.getBalance(proposer1.address);
            let governanceHubInitBalance = await ethers.provider.getBalance(governanceHub.address);

            const paramsInput1 = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String('uuid_1'),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther('0.7'),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            };

            await time.setNextBlockTimestamp(timestamp);
            const tx1 = await getGovernanceHubTxByInput_Propose(governanceHub, proposer1, paramsInput1, validator, {
                value: fee,
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1)
                .to.emit(governanceHub, 'NewProposal')
                .withArgs(
                    paramsInput1.governor,
                    1,
                    proposer1.address,
                    paramsInput1.tokenId,
                    paramsInput1.operator,
                    paramsInput1.uuid,
                    paramsInput1.rule,
                    paramsInput1.quorumRate,
                    paramsInput1.duration,
                    paramsInput1.admissionExpiry
                );

            expect(await ethers.provider.getBalance(proposer1.address)).to.equal(
                proposer1InitBalance.sub(fee).sub(gasFee1)
            );
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitBalance.add(fee));

            const proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.uuid).to.equal(paramsInput1.uuid);
            expect(proposal1.contextURI).to.equal('');
            expect(proposal1.logURI).to.equal('');
            expect(proposal1.governor).to.equal(paramsInput1.governor);
            expect(proposal1.tokenId).to.equal(paramsInput1.tokenId);
            expect(proposal1.totalWeight).to.equal(0);
            expect(proposal1.approvalWeight).to.equal(0);
            expect(proposal1.disapprovalWeight).to.equal(0);
            expect(proposal1.quorum).to.equal(paramsInput1.quorumRate);
            expect(proposal1.proposer).to.equal(proposer1.address);
            expect(proposal1.operator).to.equal(paramsInput1.operator);
            expect(proposal1.timePivot).to.equal(paramsInput1.admissionExpiry);
            expect(proposal1.due).to.equal(paramsInput1.duration);
            expect(proposal1.rule).to.equal(paramsInput1.rule);
            expect(proposal1.state).to.equal(ProposalState.Pending);
            expect(proposal1.budget).to.equal(0);
            expect(proposal1.currency).to.equal(ethers.constants.AddressZero);

            // Tx2: Send more than fee, need to be refunded
            timestamp += 10;
            let proposer2InitBalance = await ethers.provider.getBalance(proposer2.address);
            governanceHubInitBalance = await ethers.provider.getBalance(governanceHub.address);

            const paramsInput2 = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: operator2.address,
                uuid: ethers.utils.formatBytes32String('uuid_2'),
                rule: ProposalRule.DisapprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther('0.4'),
                duration: 3000,
                admissionExpiry: timestamp + 4000,
            };

            await time.setNextBlockTimestamp(timestamp);
            const tx2 = await getGovernanceHubTxByInput_Propose(governanceHub, proposer2, paramsInput2, validator, {
                value: fee.add(ethers.utils.parseEther('1')),
            });
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2)
                .to.emit(governanceHub, 'NewProposal')
                .withArgs(
                    paramsInput2.governor,
                    2,
                    proposer2.address,
                    paramsInput2.tokenId,
                    paramsInput2.operator,
                    paramsInput2.uuid,
                    paramsInput2.rule,
                    paramsInput2.quorumRate,
                    paramsInput2.duration,
                    paramsInput2.admissionExpiry
                );

            expect(await ethers.provider.getBalance(proposer2.address)).to.equal(
                proposer2InitBalance.sub(fee).sub(gasFee2)
            );
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitBalance.add(fee));

            const proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.uuid).to.equal(paramsInput2.uuid);
            expect(proposal2.contextURI).to.equal('');
            expect(proposal2.logURI).to.equal('');
            expect(proposal2.governor).to.equal(paramsInput2.governor);
            expect(proposal2.tokenId).to.equal(paramsInput2.tokenId);
            expect(proposal2.totalWeight).to.equal(0);
            expect(proposal2.approvalWeight).to.equal(0);
            expect(proposal2.disapprovalWeight).to.equal(0);
            expect(proposal2.quorum).to.equal(paramsInput2.quorumRate);
            expect(proposal2.proposer).to.equal(proposer2.address);
            expect(proposal2.operator).to.equal(paramsInput2.operator);
            expect(proposal2.timePivot).to.equal(paramsInput2.admissionExpiry);
            expect(proposal2.due).to.equal(paramsInput2.duration);
            expect(proposal2.rule).to.equal(paramsInput2.rule);
            expect(proposal2.state).to.equal(ProposalState.Pending);
            expect(proposal2.budget).to.equal(0);
            expect(proposal2.currency).to.equal(ethers.constants.AddressZero);
        });

        it('1.6.6.2. Propose unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, proposer1, validator } = fixture;

            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            const params = {
                ...defaultParams,
                validation: await getProposeValidation(governanceHub, defaultParams, validator, proposer1, false),
            };

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getGovernanceHubTx_Propose(governanceHub, proposer1, params, {
                    value: fee,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('1.6.6.3. Propose unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                pause: true,
            });
            const { governanceHub, proposer1, validator } = fixture;

            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getGovernanceHubTxByInput_Propose(governanceHub, proposer1, defaultParams, validator, { value: fee })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.6.4. Propose unsuccessfully with invalid governor', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { deployer, admin, admins, proposer1, governor, governanceHub, validator } = fixture;

            await callTransaction(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: [governor.address],
                        isGovernor: false,
                    },
                    admins
                )
            );

            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getGovernanceHubTxByInput_Propose(governanceHub, proposer1, defaultParams, validator, { value: fee })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.6.5. Propose unsuccessfully with unavailable token', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, proposer1, validator } = fixture;

            const fee = await governanceHub.fee();

            const { defaultParams } = await beforeProposeTest(fixture);

            await expect(
                getGovernanceHubTxByInput_Propose(
                    governanceHub,
                    proposer1,
                    {
                        ...defaultParams,
                        tokenId: ethers.BigNumber.from(0),
                    },
                    validator,
                    { value: fee }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');

            await expect(
                getGovernanceHubTxByInput_Propose(
                    governanceHub,
                    proposer1,
                    {
                        ...defaultParams,
                        tokenId: ethers.BigNumber.from(100),
                    },
                    validator,
                    { value: fee }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.6.6. Propose unsuccessfully with invalid quorum rate', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, proposer1, validator } = fixture;

            let timestamp = (await time.latest()) + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            const fee = await governanceHub.fee();

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getGovernanceHubTxByInput_Propose(
                    governanceHub,
                    proposer1,
                    {
                        ...defaultParams,
                        quorumRate: ethers.utils.parseEther('1').add(1),
                    },
                    validator,
                    { value: fee }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidInput');
        });

        it('1.6.6.7. Propose unsuccessfully with invalid admission expiry timestamp', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, proposer1, validator } = fixture;

            const { defaultParams } = await beforeProposeTest(fixture);

            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getGovernanceHubTxByInput_Propose(
                    governanceHub,
                    proposer1,
                    {
                        ...defaultParams,
                        admissionExpiry: timestamp - 1,
                    },
                    validator,
                    { value: fee }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidTimestamp');
        });

        it('1.6.6.8. Propose unsuccessfully when refunding native token failed', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { failReceiver, governanceHub, validator } = fixture;

            const fee = await governanceHub.fee();

            await callTransaction(failReceiver.activate(true));

            const { defaultParams } = await beforeProposeTest(fixture);

            await expect(
                getCallGovernanceHubTxByInput_Propose(governanceHub, failReceiver, defaultParams, validator, {
                    value: fee.mul(2),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'FailedRefund');
        });

        it('1.6.6.9. Propose unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, deployer, validator } = fixture;

            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const { defaultParams } = await beforeProposeTest(fixture);

            const reentrancy = (await deployReentrancyReceiver(deployer.address, true, false)) as ReentrancyReceiver;

            const fee = await governanceHub.fee();

            await testReentrancy_GovernanceHub(fixture, reentrancy, async () => {
                await expect(
                    getCallGovernanceHubTxByInput_Propose(governanceHub, reentrancy, defaultParams, validator, {
                        value: fee.mul(2),
                    })
                ).to.be.revertedWithCustomError(governanceHub, 'FailedRefund');
            });
        });
    });

    describe('1.6.7. admit(uint256,string,string,address,(uint256,uint256,bytes))', async () => {
        async function beforeAdmitTest(fixture: GovernanceHubFixture): Promise<{ defaultParams: AdmitParamsInput }> {
            const defaultParams = {
                proposalId: BigNumber.from(1),
                contextURI: 'metadata_uri_1',
                reviewURI: 'state_uri_1',
                currency: ethers.constants.AddressZero,
            };
            return { defaultParams };
        }

        it('1.6.7.1. Admit successfully with valid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, governor, custodian1, custodian2, currencies, validator } = fixture;

            // Tx1: Sent by custodian
            const paramsInput1: AdmitParamsInput = {
                proposalId: BigNumber.from(1),
                contextURI: 'metadata_uri_1',
                reviewURI: 'state_uri_1',
                currency: ethers.constants.AddressZero,
            };

            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const tokenId1 = 1;
            const totalWeight1 = await governor.totalEquityAt(tokenId1, timestamp);
            const quorumRate1 = (await governanceHub.getProposal(paramsInput1.proposalId)).quorum;
            const quorum1 = scale(totalWeight1, quorumRate1, Constant.COMMON_RATE_DECIMALS);
            const due1 = (await governanceHub.getProposal(paramsInput1.proposalId)).due;

            const tx1 = await getGovernanceHubTxByInput_Admit(governanceHub, custodian1, paramsInput1, validator);

            await expect(tx1)
                .to.emit(governanceHub, 'ProposalAdmission')
                .withArgs(
                    paramsInput1.proposalId,
                    paramsInput1.contextURI,
                    paramsInput1.reviewURI,
                    paramsInput1.currency,
                    totalWeight1,
                    quorum1
                );

            const proposal1 = await governanceHub.getProposal(paramsInput1.proposalId);
            expect(proposal1.contextURI).to.equal(paramsInput1.contextURI);
            expect(proposal1.logURI).to.equal(paramsInput1.reviewURI);
            expect(proposal1.totalWeight).to.equal(totalWeight1);
            expect(proposal1.quorum).to.equal(quorum1);
            expect(proposal1.timePivot).to.equal(timestamp);
            expect(proposal1.state).to.equal(ProposalState.Voting);
            expect(proposal1.currency).to.equal(paramsInput1.currency);
            expect(proposal1.due).to.equal(due1 + timestamp);

            // Tx2: Sent by moderator
            const paramsInput2: AdmitParamsInput = {
                proposalId: BigNumber.from(2),
                contextURI: 'metadata_uri_2',
                reviewURI: 'state_uri_2',
                currency: currencies[0].address,
            };

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tokenId2 = 2;
            const totalWeight2 = await governor.totalEquityAt(tokenId2, timestamp);
            const quorumRate2 = (await governanceHub.getProposal(paramsInput2.proposalId)).quorum;
            const quorum2 = scale(totalWeight2, quorumRate2, Constant.COMMON_RATE_DECIMALS);
            const due2 = (await governanceHub.getProposal(paramsInput2.proposalId)).due;

            const tx2 = await getGovernanceHubTxByInput_Admit(governanceHub, custodian2, paramsInput2, validator);

            await expect(tx2)
                .to.emit(governanceHub, 'ProposalAdmission')
                .withArgs(
                    paramsInput2.proposalId,
                    paramsInput2.contextURI,
                    paramsInput2.reviewURI,
                    paramsInput2.currency,
                    totalWeight2,
                    quorum2
                );

            const proposal2 = await governanceHub.getProposal(paramsInput2.proposalId);
            expect(proposal2.contextURI).to.equal(paramsInput2.contextURI);
            expect(proposal2.logURI).to.equal(paramsInput2.reviewURI);
            expect(proposal2.totalWeight).to.equal(totalWeight2);
            expect(proposal2.quorum).to.equal(quorum2);
            expect(proposal2.timePivot).to.equal(timestamp);
            expect(proposal2.state).to.equal(ProposalState.Voting);
            expect(proposal2.currency).to.equal(paramsInput2.currency);
            expect(proposal2.due).to.equal(due2 + timestamp);
        });

        it('1.6.7.2. Admit unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, custodian1, validator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);

            const params: AdmitParams = {
                ...defaultParams,
                validation: await getAdmitValidation(governanceHub, defaultParams, validator, false),
            };
            await expect(getGovernanceHubTx_Admit(governanceHub, custodian1, params)).to.be.revertedWithCustomError(
                governanceHub,
                'InvalidSignature'
            );
        });

        it('1.6.7.3. Admit unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, custodian1, custodian2, validator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(
                    governanceHub,
                    custodian1,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(0),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            await expect(
                getGovernanceHubTxByInput_Admit(
                    governanceHub,
                    custodian2,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(100),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.7.4. Admit unsuccessfully by unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, operator1, custodian2, validator, manager, moderator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            // Operator
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Wrong custodian
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian2, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Manager
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Moderator
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.7.5. Admit unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                pause: true,
            });
            const { governanceHub, custodian1, validator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.7.6. Admit unsuccessfully with voting proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.7. Admit unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.8. Admit unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub, custodian1, validator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.9. Admit unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.10. Admit unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.11. Admit unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.12. Admit unsuccessfully with admission expired proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, custodian1, custodian2, validator } = fixture;

            const timePivot1 = (await governanceHub.getProposal(1)).timePivot;
            await time.setNextBlockTimestamp(timePivot1);

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(
                    governanceHub,
                    custodian1,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(1),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'Timeout');

            const timePivot2 = (await governanceHub.getProposal(2)).timePivot;
            await time.setNextBlockTimestamp(timePivot2 + 1);

            await expect(
                getGovernanceHubTxByInput_Admit(
                    governanceHub,
                    custodian2,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(2),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'Timeout');
        });

        it('1.6.7.13. Admit unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, governor, custodian1, validator } = fixture;

            governor.isAvailable.whenCalledWith(1).returns(false);

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.7.14. Admit unsuccessfully when asset token have zero total vote power', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, governor, custodian1, validator } = fixture;

            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            governor.totalEquityAt.whenCalledWith(1, timestamp).returns(0);

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Admit(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'NoVotingPower');
        });
    });

    describe('1.6.8. disqualify(uint256,string,string,(uint256,uint256,bytes))', async () => {
        async function beforeDisqualifyTest(
            fixture: GovernanceHubFixture
        ): Promise<{ defaultParams: DisqualifyParamsInput }> {
            const defaultParams: DisqualifyParamsInput = {
                proposalId: BigNumber.from(1),
                contextURI: 'metadata_uri_1',
                reviewURI: 'state_uri_1',
            };
            return { defaultParams };
        }

        it('1.6.8.1. Disqualify pending proposal successfully by manager or representative during pending state', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, manager, custodian2, validator } = fixture;

            const paramsInput1: DisqualifyParamsInput = {
                proposalId: BigNumber.from(1),
                contextURI: 'metadata_uri_1',
                reviewURI: 'state_uri_1',
            };

            // Tx1: Disqualify by manager
            const tx1 = await getGovernanceHubTxByInput_Disqualify(governanceHub, manager, paramsInput1, validator);
            await expect(tx1)
                .to.emit(governanceHub, 'ProposalDisqualification')
                .withArgs(paramsInput1.proposalId, paramsInput1.contextURI, paramsInput1.reviewURI);

            const proposal1 = await governanceHub.getProposal(paramsInput1.proposalId);
            expect(proposal1.contextURI).to.equal(paramsInput1.contextURI);
            expect(proposal1.logURI).to.equal(paramsInput1.reviewURI);
            expect(proposal1.state).to.equal(ProposalState.Disqualified);

            const paramsInput2: DisqualifyParamsInput = {
                proposalId: BigNumber.from(2),
                contextURI: 'metadata_uri_2',
                reviewURI: 'state_uri_2',
            };

            // Tx2: Disqualify by custodian
            const tx2 = await getGovernanceHubTxByInput_Disqualify(governanceHub, custodian2, paramsInput2, validator);
            await expect(tx2)
                .to.emit(governanceHub, 'ProposalDisqualification')
                .withArgs(paramsInput2.proposalId, paramsInput2.contextURI, paramsInput2.reviewURI);

            const proposal2 = await governanceHub.getProposal(paramsInput2.proposalId);
            expect(proposal2.contextURI).to.equal(paramsInput2.contextURI);
            expect(proposal2.logURI).to.equal(paramsInput2.reviewURI);
            expect(proposal2.state).to.equal(ProposalState.Disqualified);
        });

        it('1.6.8.2. Disqualify voting proposal successfully by manager during voting state', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, manager, validator } = fixture;

            const paramsInput: DisqualifyParamsInput = {
                proposalId: BigNumber.from(1),
                contextURI: 'metadata_uri_1',
                reviewURI: 'state_uri_1',
            };

            const tx = await getGovernanceHubTxByInput_Disqualify(governanceHub, manager, paramsInput, validator);
            await expect(tx)
                .to.emit(governanceHub, 'ProposalDisqualification')
                .withArgs(paramsInput.proposalId, paramsInput.contextURI, paramsInput.reviewURI);

            const proposal1 = await governanceHub.getProposal(paramsInput.proposalId);
            expect(proposal1.contextURI).to.equal(paramsInput.contextURI);
            expect(proposal1.logURI).to.equal(paramsInput.reviewURI);
            expect(proposal1.state).to.equal(ProposalState.Disqualified);
        });

        it('1.6.8.3. Disqualify unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, manager, validator } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            const params: DisqualifyParams = {
                ...defaultParams,
                validation: await getDisqualifyValidation(governanceHub, defaultParams, validator, false),
            };
            await expect(getGovernanceHubTx_Disqualify(governanceHub, manager, params)).to.be.revertedWithCustomError(
                governanceHub,
                'InvalidSignature'
            );
        });

        it('1.6.8.4. Disqualify unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { manager, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(
                    governanceHub,
                    manager,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(0),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            await expect(
                getGovernanceHubTxByInput_Disqualify(
                    governanceHub,
                    manager,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(100),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.8.5. Disqualify unsuccessfully when zone is not active', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                skipDeclareZone: true,
            });
            const { manager, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.6. Disqualify unsuccessfully when sender is not active in zone', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { deployer, admin, admins, manager, zone, governanceHub, validator } = fixture;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.7. Disqualify unsuccessfully by unauthorized sender for pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, validator, moderator, operator1, custodian2 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);

            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Wrong custodian
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, custodian2, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.8. Disqualify unsuccessfully by non-manager for voting proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, validator, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.9. Disqualify unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.10. Disqualify unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.11. Disqualify unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.12. Disqualify unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.13. Disqualify unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_Disqualify(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });
    });

    describe('1.6.9. vote(uint256,uint8)', async () => {
        it('1.6.9.1. Vote successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, governor, voter1, voter2, voter3 } = fixture;

            // Tx1: Approval vote
            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const totalWeight = await governor.totalEquityAt(1, timestamp);
            const weight1 = await governor.equityOfAt(voter1.address, 1, timestamp);
            const weight2 = await governor.equityOfAt(voter2.address, 1, timestamp);
            const weight3 = await governor.equityOfAt(voter3.address, 1, timestamp);

            const tx1 = await getGovernanceHubTx_Vote(governanceHub, voter1, {
                proposalId: BigNumber.from(1),
                voteOption: ProposalVoteOption.Approval,
            });
            await tx1.wait();

            await expect(tx1)
                .to.emit(governanceHub, 'ProposalVote')
                .withArgs(1, voter1.address, ProposalVoteOption.Approval, weight1);

            let proposal = await governanceHub.getProposal(1);
            expect(proposal.totalWeight).to.equal(totalWeight);
            expect(proposal.approvalWeight).to.equal(weight1);
            expect(proposal.disapprovalWeight).to.equal(0);

            let voteOption = await governanceHub.voteOptions(1, voter1.address);
            expect(voteOption).to.equal(ProposalVoteOption.Approval);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);

            // Tx2: Disapproval vote
            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tx2 = await getGovernanceHubTx_Vote(governanceHub, voter2, {
                proposalId: BigNumber.from(1),
                voteOption: ProposalVoteOption.Disapproval,
            });
            await tx2.wait();

            await expect(tx2)
                .to.emit(governanceHub, 'ProposalVote')
                .withArgs(1, voter2.address, ProposalVoteOption.Disapproval, weight2);

            proposal = await governanceHub.getProposal(1);
            expect(proposal.totalWeight).to.equal(totalWeight);
            expect(proposal.approvalWeight).to.equal(weight1);
            expect(proposal.disapprovalWeight).to.equal(weight2);

            voteOption = await governanceHub.voteOptions(1, voter2.address);
            expect(voteOption).to.equal(ProposalVoteOption.Disapproval);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);

            // Tx3: Another approval vote
            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tx3 = await getGovernanceHubTx_Vote(governanceHub, voter3, {
                proposalId: BigNumber.from(1),
                voteOption: ProposalVoteOption.Approval,
            });
            await tx3.wait();

            await expect(tx3)
                .to.emit(governanceHub, 'ProposalVote')
                .withArgs(1, voter3.address, ProposalVoteOption.Approval, weight3);

            proposal = await governanceHub.getProposal(1);
            expect(proposal.totalWeight).to.equal(totalWeight);
            expect(proposal.approvalWeight).to.equal(weight1.add(weight3));
            expect(proposal.disapprovalWeight).to.equal(weight2);

            voteOption = await governanceHub.voteOptions(1, voter3.address);
            expect(voteOption).to.equal(ProposalVoteOption.Approval);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.9.2. Vote unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, voter1, voter2 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(0),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(100),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.9.3. Vote unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                pause: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.9.4. Vote unsuccessfully with pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, voter1, voter2 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.5. Vote unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.6. Vote unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.7. Vote unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.8. Vote unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.9. Vote unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.10. Vote unsuccessfully when voting is overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, voter1 } = fixture;

            let due = (await governanceHub.getProposal(1)).due;
            await time.setNextBlockTimestamp(due);

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Overdue');

            due += 10;
            await time.setNextBlockTimestamp(due);

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Overdue');
        });

        it('1.6.9.11. Vote unsuccessfully when sender has already voted', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            );

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'AlreadyVoted');
            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'AlreadyVoted');
        });

        it('1.6.9.12. Vote unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, governor } = fixture;

            governor.isAvailable.whenCalledWith(1).returns(false);
            governor.isAvailable.whenCalledWith(2).returns(false);

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(2),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.9.13. Vote unsuccessfully when sender has no vote power', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, proposer2 } = fixture;

            await expect(
                getGovernanceHubTx_Vote(governanceHub, proposer2, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'NoVotingPower');
        });

        it('1.6.9.14. Vote unsuccessfully when sum of vote exceed total vote power', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, governor, voter1, voter2, voter3 } = fixture;

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            );

            await callTransaction(
                getGovernanceHubTx_Vote(governanceHub, voter2, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            );

            let timestamp = (await governanceHub.getProposal(1)).timePivot;

            const voter3Vote = await governor.equityOfAt(voter3.address, 1, timestamp);
            governor.equityOfAt.whenCalledWith(voter3.address, 1, timestamp).returns(voter3Vote.add(1));

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'ConflictedWeight');

            await expect(
                getGovernanceHubTx_Vote(governanceHub, voter3, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Disapproval,
                })
            ).to.be.revertedWithCustomError(governanceHub, 'ConflictedWeight');

            governor.equityOfAt.reset();
        });
    });

    describe('1.6.10. safeVote(uint256,uint8,bytes32)', async () => {
        it('1.6.10.1. Safe vote successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, governor, voter1, voter2, voter3 } = fixture;

            // Tx1: Approval vote
            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const totalWeight = await governor.totalEquityAt(1, timestamp);
            const weight1 = await governor.equityOfAt(voter1.address, 1, timestamp);
            const weight2 = await governor.equityOfAt(voter2.address, 1, timestamp);
            const weight3 = await governor.equityOfAt(voter3.address, 1, timestamp);

            const params1: VoteParams = {
                proposalId: BigNumber.from(1),
                voteOption: ProposalVoteOption.Approval,
            };
            const tx1 = await getGovernanceHubTxByParams_SafeVote(governanceHub, voter1, params1);
            await tx1.wait();

            await expect(tx1)
                .to.emit(governanceHub, 'ProposalVote')
                .withArgs(1, voter1.address, ProposalVoteOption.Approval, weight1);

            let proposal = await governanceHub.getProposal(1);
            expect(proposal.totalWeight).to.equal(totalWeight);
            expect(proposal.approvalWeight).to.equal(weight1);
            expect(proposal.disapprovalWeight).to.equal(0);

            let voteOption = await governanceHub.voteOptions(1, voter1.address);
            expect(voteOption).to.equal(ProposalVoteOption.Approval);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);

            // Tx2: Disapproval vote
            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const params2: VoteParams = {
                proposalId: BigNumber.from(1),
                voteOption: ProposalVoteOption.Disapproval,
            };
            const tx2 = await getGovernanceHubTxByParams_SafeVote(governanceHub, voter2, params2);
            await tx2.wait();

            await expect(tx2)
                .to.emit(governanceHub, 'ProposalVote')
                .withArgs(1, voter2.address, ProposalVoteOption.Disapproval, weight2);

            proposal = await governanceHub.getProposal(1);
            expect(proposal.totalWeight).to.equal(totalWeight);
            expect(proposal.approvalWeight).to.equal(weight1);
            expect(proposal.disapprovalWeight).to.equal(weight2);

            voteOption = await governanceHub.voteOptions(1, voter2.address);
            expect(voteOption).to.equal(ProposalVoteOption.Disapproval);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);

            // Tx3: Another approval vote
            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const params3: VoteParams = {
                proposalId: BigNumber.from(1),
                voteOption: ProposalVoteOption.Approval,
            };
            const tx3 = await getGovernanceHubTxByParams_SafeVote(governanceHub, voter3, params3);
            await tx3.wait();

            await expect(tx3)
                .to.emit(governanceHub, 'ProposalVote')
                .withArgs(1, voter3.address, ProposalVoteOption.Approval, weight3);

            proposal = await governanceHub.getProposal(1);
            expect(proposal.totalWeight).to.equal(totalWeight);
            expect(proposal.approvalWeight).to.equal(weight1.add(weight3));
            expect(proposal.disapprovalWeight).to.equal(weight2);

            voteOption = await governanceHub.voteOptions(1, voter3.address);
            expect(voteOption).to.equal(ProposalVoteOption.Approval);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.10.2. Safe vote unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_SafeVote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                    anchor: ethers.utils.formatBytes32String('Blockchain'),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'BadAnchor');
        });

        it('1.6.10.3. Safe vote unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_SafeVote(governanceHub, voter1, {
                    proposalId: BigNumber.from(0),
                    voteOption: ProposalVoteOption.Approval,
                    anchor: ethers.utils.formatBytes32String('Blockchain'),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.10.4. Safe vote unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                pause: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTxByParams_SafeVote(governanceHub, voter1, {
                    proposalId: BigNumber.from(1),
                    voteOption: ProposalVoteOption.Approval,
                })
            ).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('1.6.11. contributeBudget(uint256,uint256)', async () => {
        it('1.6.11.1. Contribute budget successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, proposer2, currencies } = fixture;

            // Tx1: Contribution by token holder with native token
            let governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let voter1InitNativeBalance = await ethers.provider.getBalance(voter1.address);

            const value1 = ethers.utils.parseEther('1');
            const params1: ContributeBudgetParams = {
                proposalId: BigNumber.from(1),
                value: BigNumber.from(value1),
            };
            const tx1 = await getGovernanceHubTx_ContributeBudget(governanceHub, voter1, params1, {
                value: params1.value,
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1)
                .to.emit(governanceHub, 'ProposalBudgetContribution')
                .withArgs(params1.proposalId, voter1.address, params1.value);

            let proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.budget).to.equal(value1);
            expect(await governanceHub.contributions(1, voter1.address)).to.equal(value1);

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                governanceHubInitNativeBalance.add(value1)
            );
            expect(await ethers.provider.getBalance(voter1.address)).to.equal(
                voter1InitNativeBalance.sub(value1).sub(gasFee1)
            );

            // Tx2: Contribution by token holder with native token, need to refund exceed amount
            voter1InitNativeBalance = await ethers.provider.getBalance(voter1.address);
            governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const value2 = ethers.utils.parseEther('2');
            const params2: ContributeBudgetParams = {
                proposalId: BigNumber.from(1),
                value: BigNumber.from(value2),
            };
            const tx2 = await getGovernanceHubTx_ContributeBudget(governanceHub, voter1, params2, {
                value: value2.add(1),
            });
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2)
                .to.emit(governanceHub, 'ProposalBudgetContribution')
                .withArgs(params2.proposalId, voter1.address, params2.value);

            proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.budget).to.equal(value1.add(value2));
            expect(await governanceHub.contributions(1, voter1.address)).to.equal(value1.add(value2));

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                governanceHubInitNativeBalance.add(value2)
            );
            expect(await ethers.provider.getBalance(voter1.address)).to.equal(
                voter1InitNativeBalance.sub(value2).sub(gasFee2)
            );

            // Tx3: Contribution by non-token holder with native token
            let proposer2InitNativeBalance = await ethers.provider.getBalance(proposer2.address);
            governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const value3 = ethers.utils.parseEther('4');
            const params3: ContributeBudgetParams = {
                proposalId: BigNumber.from(1),
                value: BigNumber.from(value3),
            };
            const tx3 = await getGovernanceHubTx_ContributeBudget(governanceHub, proposer2, params3, { value: value3 });
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);

            await expect(tx3)
                .to.emit(governanceHub, 'ProposalBudgetContribution')
                .withArgs(params3.proposalId, proposer2.address, params3.value);

            proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.budget).to.equal(value1.add(value2).add(value3));
            expect(await governanceHub.contributions(1, proposer2.address)).to.equal(value3);

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                governanceHubInitNativeBalance.add(value3)
            );
            expect(await ethers.provider.getBalance(proposer2.address)).to.equal(
                proposer2InitNativeBalance.sub(value3).sub(gasFee3)
            );

            // Tx4: Contribution by token holder with erc20
            const currency = currencies[0];
            await prepareERC20(currency, [voter1, proposer2], [governanceHub], ethers.utils.parseEther(String(1e9)));

            let voter1InitERC20Balance = await currency.balanceOf(voter1.address);
            let governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);

            const value4 = ethers.utils.parseEther('8');
            const params4: ContributeBudgetParams = {
                proposalId: BigNumber.from(2),
                value: BigNumber.from(value4),
            };
            const tx4 = await getGovernanceHubTx_ContributeBudget(governanceHub, voter1, params4);
            await tx4.wait();

            await expect(tx4)
                .to.emit(governanceHub, 'ProposalBudgetContribution')
                .withArgs(params4.proposalId, voter1.address, params4.value);

            let proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.budget).to.equal(value4);
            expect(await governanceHub.contributions(2, voter1.address)).to.equal(value4);

            expect(await currency.balanceOf(voter1.address)).to.equal(voter1InitERC20Balance.sub(value4));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.add(value4));

            // Tx5: Contribution by the same voter with erc20
            voter1InitERC20Balance = await currency.balanceOf(voter1.address);
            governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);

            const value5 = ethers.utils.parseEther('16');
            const params5: ContributeBudgetParams = {
                proposalId: BigNumber.from(2),
                value: BigNumber.from(value5),
            };
            const tx5 = await getGovernanceHubTx_ContributeBudget(governanceHub, voter1, params5);
            await tx5.wait();

            await expect(tx5)
                .to.emit(governanceHub, 'ProposalBudgetContribution')
                .withArgs(params5.proposalId, voter1.address, params5.value);

            proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.budget).to.equal(value4.add(value5));
            expect(await governanceHub.contributions(2, voter1.address)).to.equal(value4.add(value5));

            expect(await currency.balanceOf(voter1.address)).to.equal(voter1InitERC20Balance.sub(value5));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.add(value5));

            // Tx6: Contribution by non-token holder with erc20
            let proposer2InitERC20Balance = await currency.balanceOf(proposer2.address);
            governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);

            const value6 = ethers.utils.parseEther('32');
            const params6: ContributeBudgetParams = {
                proposalId: BigNumber.from(2),
                value: BigNumber.from(value6),
            };
            const tx6 = await getGovernanceHubTx_ContributeBudget(governanceHub, proposer2, params6);
            await tx6.wait();

            await expect(tx6)
                .to.emit(governanceHub, 'ProposalBudgetContribution')
                .withArgs(params6.proposalId, proposer2.address, params6.value);

            proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.budget).to.equal(value4.add(value5).add(value6));
            expect(await governanceHub.contributions(2, proposer2.address)).to.equal(value6);

            expect(await currency.balanceOf(proposer2.address)).to.equal(proposer2InitERC20Balance.sub(value6));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.add(value6));
        });

        it('1.6.11.2. Contribute budget unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_ContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(0),
                        value: ethers.utils.parseEther('1'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.11.3. Contribute budget unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                pause: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_ContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.11.4. Contribute budget unsuccessfully with pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_ContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.5. Contribute budget unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_ContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.6. Contribute budget unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_ContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.7. Contribute budget unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_ContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.8. Contribute budget unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_ContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.9. Contribute budget unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_ContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.10. Contribute budget unsuccessfully when execution confirmation is overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            let timestamp = (await governanceHub.getProposal(1)).due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT;
            await time.setNextBlockTimestamp(timestamp);
            const params: ContributeBudgetParams = {
                proposalId: BigNumber.from(1),
                value: ethers.utils.parseEther('1'),
            };

            await expect(
                getGovernanceHubTx_ContributeBudget(governanceHub, voter1, params, {
                    value: ethers.utils.parseEther('1'),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Timeout');

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getGovernanceHubTx_ContributeBudget(governanceHub, voter1, params, {
                    value: ethers.utils.parseEther('1'),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Timeout');
        });

        it('1.6.11.11. Contribute budget unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                useReentrancyERC20: true,
            });

            const { proposer1, reentrancyERC20, governanceHub } = fixture;

            await testReentrancy_GovernanceHub(fixture, reentrancyERC20, async () => {
                await expect(
                    getGovernanceHubTx_ContributeBudget(governanceHub, proposer1, {
                        proposalId: BigNumber.from(2),
                        value: ethers.utils.parseEther('1'),
                    })
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });
    });

    describe('1.6.12. safeContributeBudget(uint256,uint256,bytes32)', async () => {
        it('1.6.12.1. Safe contribute budget successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            let governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let voter1InitNativeBalance = await ethers.provider.getBalance(voter1.address);

            const value = ethers.utils.parseEther('1');
            const params: ContributeBudgetParams = {
                proposalId: BigNumber.from(1),
                value: value,
            };
            const tx1 = await getGovernanceHubTxByInput_SafeContributeBudget(governanceHub, voter1, params, {
                value: value,
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalBudgetContribution').withArgs(1, voter1.address, value);

            let proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.budget).to.equal(value);
            expect(await governanceHub.contributions(1, voter1.address)).to.equal(value);

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                governanceHubInitNativeBalance.add(value)
            );
            expect(await ethers.provider.getBalance(voter1.address)).to.equal(
                voter1InitNativeBalance.sub(value).sub(gasFee1)
            );
        });

        it('1.6.12.2. Safe contribute budget unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_SafeContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(1),
                        value: ethers.utils.parseEther('1'),
                        anchor: ethers.utils.formatBytes32String('Blockchain'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'BadAnchor');
        });

        it('1.6.12.3. Safe contribute budget unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, voter1 } = fixture;

            await expect(
                getGovernanceHubTx_SafeContributeBudget(
                    governanceHub,
                    voter1,
                    {
                        proposalId: BigNumber.from(0),
                        value: ethers.utils.parseEther('1'),
                        anchor: ethers.utils.formatBytes32String('Blockchain'),
                    },
                    { value: ethers.utils.parseEther('1') }
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });
    });

    describe('1.6.13. withdrawBudgetContribution(uint256)', async () => {
        it('1.6.13.1. Withdraw budget contribution successfully with failed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, contributor1, contributor2, currencies } = fixture;

            // Tx1: Withdraw budget contribution of native token
            let governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let contributor1InitNativeBalance = await ethers.provider.getBalance(contributor1.address);

            const value1 = await governanceHub.contributions(1, contributor1.address);
            const tx1 = await getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                proposalId: BigNumber.from(1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1)
                .to.emit(governanceHub, 'ProposalBudgetContributionWithdrawal')
                .withArgs(1, contributor1.address, value1);

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                governanceHubInitNativeBalance.sub(value1)
            );
            expect(await ethers.provider.getBalance(contributor1.address)).to.equal(
                contributor1InitNativeBalance.add(value1).sub(gasFee1)
            );
            expect(await governanceHub.contributions(1, contributor1.address)).to.equal(0);

            // Tx2: Withdraw budget contribution of erc20
            const currency = currencies[0];
            let governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);
            let contributor2InitERC20Balance = await currency.balanceOf(contributor2.address);

            const value2 = await governanceHub.contributions(2, contributor2.address);
            const tx2 = await getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor2, {
                proposalId: BigNumber.from(2),
            });
            await tx2.wait();

            await expect(tx2)
                .to.emit(governanceHub, 'ProposalBudgetContributionWithdrawal')
                .withArgs(2, contributor2.address, value2);

            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.sub(value2));
            expect(await currency.balanceOf(contributor2.address)).to.equal(contributor2InitERC20Balance.add(value2));
            expect(await governanceHub.contributions(2, contributor2.address)).to.equal(0);
        });

        it('1.6.13.2. Withdraw budget contribution successfully with confirmation overdue proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, contributor1, contributor2, currencies } = fixture;

            // Tx1: Withdraw at exact overdue timestamp
            let timestamp = (await governanceHub.getProposal(1)).due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT;
            await time.setNextBlockTimestamp(timestamp);

            let governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let contributor1InitNativeBalance = await ethers.provider.getBalance(contributor1.address);

            const value1 = await governanceHub.contributions(1, contributor1.address);
            const tx1 = await getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                proposalId: BigNumber.from(1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1)
                .to.emit(governanceHub, 'ProposalBudgetContributionWithdrawal')
                .withArgs(1, contributor1.address, value1);

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                governanceHubInitNativeBalance.sub(value1)
            );
            expect(await ethers.provider.getBalance(contributor1.address)).to.equal(
                contributor1InitNativeBalance.add(value1).sub(gasFee1)
            );
            expect(await governanceHub.contributions(1, contributor1.address)).to.equal(0);

            // Tx2: Withdraw at slightly after overdue timestamp
            timestamp = (await governanceHub.getProposal(2)).due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT + 10;
            await time.setNextBlockTimestamp(timestamp);

            const currency = currencies[0];
            let governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);
            let contributor2InitERC20Balance = await currency.balanceOf(contributor2.address);

            const value2 = await governanceHub.contributions(2, contributor2.address);
            const tx2 = await getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor2, {
                proposalId: BigNumber.from(2),
            });
            await tx2.wait();

            await expect(tx2)
                .to.emit(governanceHub, 'ProposalBudgetContributionWithdrawal')
                .withArgs(2, contributor2.address, value2);

            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.sub(value2));
            expect(await currency.balanceOf(contributor2.address)).to.equal(contributor2InitERC20Balance.add(value2));
            expect(await governanceHub.contributions(2, contributor2.address)).to.equal(0);
        });

        it('1.6.13.3. Withdraw budget contribution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, contributor1 } = fixture;

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.13.4. Withdraw budget contribution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                pause: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.13.5. Withdraw budget contribution unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                useReentrancyERC20: true,
            });

            const { reentrancyERC20, governanceHub, contributor2 } = fixture;

            await testReentrancy_GovernanceHub(fixture, reentrancyERC20, async () => {
                await expect(
                    getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor2, {
                        proposalId: BigNumber.from(2),
                    })
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('1.6.13.6. Withdraw budget contribution unsuccessfully with pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.7. Withdraw budget contribution unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.8. Withdraw budget contribution unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.9. Withdraw budget contribution unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.10. Withdraw budget contribution unsuccessfully when proposal is voting and execution confirmation is not overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.11. Withdraw budget contribution unsuccessfully when sender did not contribute', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, proposer2 } = fixture;

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, proposer2, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'NothingToWithdraw');
        });

        it('1.6.13.12. Withdraw budget contribution unsuccessfully when sender has already withdrawn contribution', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await callTransaction(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(1),
                })
            );

            await expect(
                getGovernanceHubTx_WithdrawBudgetContribution(governanceHub, contributor1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'NothingToWithdraw');
        });

        it('1.6.13.13. Withdraw budget contribution unsuccessfully when sending native token failed', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                useFailReceiverContributor: true,
            });

            const { governanceHub, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(
                failReceiver.call(
                    governanceHub.address,
                    governanceHub.interface.encodeFunctionData('withdrawBudgetContribution', [1])
                )
            ).to.be.revertedWithCustomError(governanceHub, 'FailedTransfer');
        });
    });

    describe('1.6.14. confirm(uint256)', async () => {
        it('1.6.14.1. Confirm execution successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager, operator1, operator2, currencies } = fixture;

            // Tx1: confirm execution with native token budget
            let initManagerNativeBalance = await ethers.provider.getBalance(manager.address);
            let initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let initOperator1NativeBalance = await ethers.provider.getBalance(operator1.address);

            const budget1 = (await governanceHub.getProposal(1)).budget;

            const tx1 = await getGovernanceHubTx_Confirm(governanceHub, manager, {
                proposalId: BigNumber.from(1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalConfirmation').withArgs(1, budget1);

            expect(await ethers.provider.getBalance(manager.address)).to.equal(initManagerNativeBalance.sub(gasFee1));
            expect(await ethers.provider.getBalance(operator1.address)).to.equal(
                initOperator1NativeBalance.add(budget1)
            );
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                initGovernanceHubNativeBalance.sub(budget1)
            );

            let proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.state).to.equal(ProposalState.Executing);

            // Tx2: confirm execution with erc20 budget
            const currency = currencies[0];
            let initManagerERC20Balance = await currency.balanceOf(manager.address);
            let initGovernanceHubERC20Balance = await currency.balanceOf(governanceHub.address);
            let initOperator2ERC20Balance = await currency.balanceOf(operator2.address);

            const budget2 = (await governanceHub.getProposal(2)).budget;

            const tx2 = await getGovernanceHubTx_Confirm(governanceHub, manager, {
                proposalId: BigNumber.from(2),
            });
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalConfirmation').withArgs(2, budget2);

            expect(await currency.balanceOf(manager.address)).to.equal(initManagerERC20Balance);
            expect(await currency.balanceOf(operator2.address)).to.equal(initOperator2ERC20Balance.add(budget2));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(
                initGovernanceHubERC20Balance.sub(budget2)
            );

            let proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.state).to.equal(ProposalState.Executing);
        });

        it('1.6.14.2. Confirm execution successfully with no budget', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
            });

            const { governanceHub, manager, operator1 } = fixture;

            // Tx1: confirm execution with no budget
            let initManagerNativeBalance = await ethers.provider.getBalance(manager.address);
            let initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let initOperator1NativeBalance = await ethers.provider.getBalance(operator1.address);

            const tx1 = await getGovernanceHubTx_Confirm(governanceHub, manager, {
                proposalId: BigNumber.from(1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalConfirmation').withArgs(1, 0);

            expect(await ethers.provider.getBalance(manager.address)).to.equal(initManagerNativeBalance.sub(gasFee1));
            expect(await ethers.provider.getBalance(operator1.address)).to.equal(initOperator1NativeBalance);
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance);

            let proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.state).to.equal(ProposalState.Executing);
        });

        it('1.6.14.3. Confirm execution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.14.4. Confirm execution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                pause: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.14.5. Confirm execution unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                useReentrancyERC20: true,
            });

            const { governanceHub, reentrancyERC20, manager } = fixture;

            await testReentrancy_GovernanceHub(fixture, reentrancyERC20, async () => {
                await expect(
                    getGovernanceHubTx_Confirm(governanceHub, manager, {
                        proposalId: BigNumber.from(2),
                    })
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('1.6.14.6. Confirm execution unsuccessfully with unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, moderator, operator1, custodian1 } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, moderator, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, custodian1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.14.7. Confirm execution unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager, governor } = fixture;

            governor.isAvailable.whenCalledWith(1).returns(false);

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.14.8. Confirm execution unsuccessfully when sender is inactive in zone', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { deployer, governanceHub, admin, admins, zone, manager } = fixture;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.14.9. Confirm execution unsuccessfully with pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.10. Confirm execution unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.11. Confirm execution unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.12. Confirm execution unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.13. Confirm execution unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.14. Confirm execution unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.15. Confirm execution unsuccessfully when execution confirmation is overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            let timestamp = (await governanceHub.getProposal(1)).due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.16. Confirm execution unsuccessfully with failed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.17. Confirm execution unsuccessfully with unsettled proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.18. Confirm execution unsuccessfully when transferring to operator failed', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                useFailReceiverOperator: true,
            });

            const { governanceHub, failReceiver, manager } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(
                getGovernanceHubTx_Confirm(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'FailedTransfer');
        });
    });

    describe('1.6.15. rejectExecution(uint256)', async () => {
        it('1.6.15.1. Reject execution successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, operator1, operator2 } = fixture;

            const tx1 = await getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                proposalId: BigNumber.from(1),
            });
            await tx1.wait();

            await expect(tx1).to.emit(governanceHub, 'ProposalExecutionRejection').withArgs(1);

            const proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.state).to.equal(ProposalState.Rejected);

            const tx2 = await getGovernanceHubTx_RejectExecution(governanceHub, operator2, {
                proposalId: BigNumber.from(2),
            });
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalExecutionRejection').withArgs(2);

            const proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.state).to.equal(ProposalState.Rejected);
        });

        it('1.6.15.2. Reject execution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();

            const { governanceHub, operator1 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.15.3. Reject execution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                pause: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.15.4. Reject execution unsuccessfully with unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, moderator, manager, custodian1, operator1, operator2 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, moderator, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, manager, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, custodian1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            // Wrong operator
            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator2, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.15.5. Reject execution unsuccessfully with pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });

        it('1.6.15.6. Reject execution unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });

        it('1.6.15.7. Reject execution unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });

        it('1.6.15.8. Reject execution unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });

        it('1.6.15.9. Reject execution unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });

        it('1.6.15.10. Reject execution unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(
                getGovernanceHubTx_RejectExecution(governanceHub, operator1, {
                    proposalId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });
    });

    describe('1.6.16. logExecution(uint256,string,(uint256,uint256,bytes))', async () => {
        async function beforeLogExecutionTest(
            fixture: GovernanceHubFixture
        ): Promise<{ defaultParams: LogExecutionParamsInput }> {
            const defaultParams = {
                proposalId: BigNumber.from(1),
                logURI: 'updated_state_uri_1',
            };
            return { defaultParams };
        }

        it('1.6.16.1. Update execution successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, operator1, operator2, validator } = fixture;

            // Tx1: Operator 1
            const paramsInput1: LogExecutionParamsInput = {
                proposalId: BigNumber.from(1),
                logURI: 'updated_state_uri_1',
            };

            const tx1 = await getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, paramsInput1, validator);
            await tx1.wait();

            await expect(tx1)
                .to.emit(governanceHub, 'ProposalExecutionLog')
                .withArgs(paramsInput1.proposalId, paramsInput1.logURI);

            const proposal1 = await governanceHub.getProposal(paramsInput1.proposalId);
            expect(proposal1.state).to.equal(ProposalState.Executing);
            expect(proposal1.logURI).to.equal(paramsInput1.logURI);

            // Tx2: Operator 2
            const paramsInput2: LogExecutionParamsInput = {
                proposalId: BigNumber.from(2),
                logURI: 'updated_state_uri_2',
            };

            const tx2 = await getGovernanceHubTxByInput_LogExecution(governanceHub, operator2, paramsInput2, validator);
            await tx2.wait();

            await expect(tx2)
                .to.emit(governanceHub, 'ProposalExecutionLog')
                .withArgs(paramsInput2.proposalId, paramsInput2.logURI);

            const proposal2 = await governanceHub.getProposal(paramsInput2.proposalId);
            expect(proposal2.state).to.equal(ProposalState.Executing);
            expect(proposal2.logURI).to.equal(paramsInput2.logURI);
        });

        it('1.6.16.2. Update execution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();

            const { operator1, operator2, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);
            await expect(
                getGovernanceHubTxByInput_LogExecution(
                    governanceHub,
                    operator1,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(0),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            await expect(
                getGovernanceHubTxByInput_LogExecution(
                    governanceHub,
                    operator2,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(100),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.16.3. Update execution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                pause: true,
            });

            const { operator1, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.16.4. Update execution unsuccessfully with unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { moderator, manager, operator1, operator2, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTxByInput_LogExecution(
                    governanceHub,
                    operator2,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(1),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTxByInput_LogExecution(
                    governanceHub,
                    operator1,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(2),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.16.5. Update execution unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, operator1, validator } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);
            const params: LogExecutionParams = {
                ...defaultParams,
                validation: await getLogExecutionValidation(governanceHub, defaultParams, validator, false),
            };

            await expect(
                getGovernanceHubTx_LogExecution(governanceHub, operator1, params)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('1.6.16.6. Update execution unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { operator1, governanceHub, validator, governor } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            governor.isAvailable.whenCalledWith(1).returns(false);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.16.7. Update execution unsuccessfully with pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.8. Update execution unsuccessfully with voting proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.9. Update execution unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.10. Update execution unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.11. Update execution unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.12. Update execution unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_LogExecution(governanceHub, operator1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });
    });

    describe('1.6.17. concludeExecution(uint256,string,bool,(uint256,uint256,bytes))', async () => {
        async function beforeConcludeExecutionTest(
            fixture: GovernanceHubFixture
        ): Promise<{ defaultParams: ConcludeExecutionParamsInput }> {
            const defaultParams: ConcludeExecutionParamsInput = {
                proposalId: BigNumber.from(1),
                logURI: 'concluded_state_uri_1',
                isSuccessful: true,
            };
            return { defaultParams };
        }

        it('1.6.17.1. Conclude execution successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, validator, custodian1, custodian2 } = fixture;

            // Tx1: Conclude execution succeeded
            const paramsInput1: ConcludeExecutionParamsInput = {
                proposalId: BigNumber.from(1),
                logURI: 'concluded_state_uri_1',
                isSuccessful: true,
            };

            const tx1 = await getGovernanceHubTxByInput_ConcludeExecution(
                governanceHub,
                custodian1,
                paramsInput1,
                validator
            );
            await tx1.wait();

            await expect(tx1)
                .to.emit(governanceHub, 'ProposalExecutionConclusion')
                .withArgs(paramsInput1.proposalId, paramsInput1.logURI, paramsInput1.isSuccessful);

            const proposal1 = await governanceHub.getProposal(paramsInput1.proposalId);
            expect(proposal1.state).to.equal(ProposalState.SuccessfulExecuted);
            expect(proposal1.logURI).to.equal(paramsInput1.logURI);

            // Tx2: Conclude execution failed
            const paramsInput2: ConcludeExecutionParamsInput = {
                proposalId: BigNumber.from(2),
                logURI: 'concluded_state_uri_2',
                isSuccessful: false,
            };

            const tx2 = await getGovernanceHubTxByInput_ConcludeExecution(
                governanceHub,
                custodian2,
                paramsInput2,
                validator
            );
            await tx2.wait();

            await expect(tx2)
                .to.emit(governanceHub, 'ProposalExecutionConclusion')
                .withArgs(paramsInput2.proposalId, paramsInput2.logURI, paramsInput2.isSuccessful);

            const proposal2 = await governanceHub.getProposal(paramsInput2.proposalId);
            expect(proposal2.state).to.equal(ProposalState.UnsuccessfulExecuted);
            expect(proposal2.logURI).to.equal(paramsInput2.logURI);
        });

        it('1.6.17.2. Conclude execution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(
                    governanceHub,
                    custodian1,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(0),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(
                    governanceHub,
                    custodian1,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(100),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.17.3. Conclude execution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                pause: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.17.4. Conclude execution unsuccessfully with unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { moderator, manager, custodian1, custodian2, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(
                    governanceHub,
                    custodian2,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(1),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(
                    governanceHub,
                    custodian1,
                    {
                        ...defaultParams,
                        proposalId: BigNumber.from(2),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.17.5. Conclude execution unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);
            const params: ConcludeExecutionParams = {
                ...defaultParams,
                validation: await getConcludeExecutionValidation(governanceHub, defaultParams, validator, false),
            };

            await expect(
                getGovernanceHubTx_ConcludeExecution(governanceHub, custodian1, params)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('1.6.17.6. Conclude execution unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, validator, governor, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            governor.isAvailable.whenCalledWith(1).returns(false);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.17.7. Conclude execution unsuccessfully with pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });

        it('1.6.17.8. Conclude execution unsuccessfully with voting proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });

        it('1.6.17.9. Conclude execution unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });

        it('1.6.17.10. Conclude execution unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });

        it('1.6.17.11. Conclude execution unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });

        it('1.6.17.12. Conclude execution unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(
                getGovernanceHubTxByInput_ConcludeExecution(governanceHub, custodian1, defaultParams, validator)
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });
    });
});
