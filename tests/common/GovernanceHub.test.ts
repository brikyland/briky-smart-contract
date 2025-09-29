import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    GovernanceHub,
    Governor,
    Governor__factory,
    Currency,
    ReentrancyERC20,
    FailReceiver,
    Reentrancy,
} from '@typechain-types';
import {
    callTransaction,
    callTransactionAtTimestamp,
    expectRevertWithModifierCustomError,
    getSignatures,
    prepareERC20,
    prepareNativeToken,
    testReentrancy
} from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { Initialization as CommonInitialization } from '@tests/common/test.initialization';
import { deployAdmin } from '@utils/deployments/common/admin';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';
import { ProposalVerdict } from "@utils/models/common/governanceHub";
import { ProposalState } from "@utils/models/common/governanceHub";
import { ProposalRule } from "@utils/models/common/governanceHub";
import { ProposalVoteOption } from "@utils/models/common/governanceHub";
import { BigNumber, Contract, Wallet } from 'ethers';
import { MockContract, smock } from '@defi-wonderland/smock';
import { callAdmin_ActivateIn, callAdmin_AuthorizeGovernor, callAdmin_AuthorizeManagers, callAdmin_AuthorizeModerators, callAdmin_DeclareZone } from '@utils/call/common/admin';
import { MockValidator } from '@utils/mockValidator';
import { scale } from "@utils/formula";
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancyERC20 } from '@utils/deployments/mock/mockReentrancy/reentrancyERC20';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { ProposeParams, AdmitParams, DisqualifyParams, LogExecutionParams, ConcludeExecutionParams } from '@utils/models/common/governanceHub';
import { getProposeValidation, getProposeInvalidValidation, getAdmitInvalidValidation, getDisqualifyInvalidValidation, getLogExecutionValidation, getLogExecutionInvalidValidation, getConcludeExecutionInvalidValidation } from '@utils/validation/common/governanceHub';
import { getAdmitTx, getCallProposeTx, getConcludeExecutionTx, getDisqualifyTx, getLogExecutionTx, getProposeTx } from '@utils/transaction/common/governanceHub';
import { callPausable_Pause } from '@utils/call/common/pausable';

export interface GovernanceHubFixture {
    admin: Admin;
    governanceHub: GovernanceHub;
    governor: MockContract<Governor>;
    currencies: Currency[];
    failReceiver: FailReceiver;
    reentrancyERC20: ReentrancyERC20;

    deployer: any;
    admins: any[];
    validator: MockValidator;
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
    zone: any;
}

async function testReentrancy_GovernanceHub(
    fixture: GovernanceHubFixture,
    reentrancyContract: Contract,
    assertion: any,
) {
    const { proposer2, governor, operator2, governanceHub, validator } = fixture;
    
    let timestamp = await time.latest() + 10;
    const proposeParams = {
        governor: governor.address,
        tokenId: ethers.BigNumber.from(2),
        operator: operator2.address,
        uuid: ethers.utils.formatBytes32String("uuid_2"),
        rule: ProposalRule.DisapprovalBeyondQuorum,
        quorumRate: ethers.utils.parseEther("0.4"),
        duration: 3000,
        admissionExpiry: timestamp + 4000,
    }
    const proposeValidation = await getProposeValidation(governanceHub, validator, proposer2, proposeParams);

    let data = [
        governanceHub.interface.encodeFunctionData("propose", [
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
        governanceHub.interface.encodeFunctionData("withdrawBudgetContribution", [1]),
        governanceHub.interface.encodeFunctionData("confirm", [1]),
    ];

    await testReentrancy(
        reentrancyContract,
        governanceHub,
        data,
        assertion,
    );
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
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const validatorWallet = accounts[Constant.ADMIN_NUMBER + 1];
        const proposer1 = accounts[Constant.ADMIN_NUMBER + 2];
        const proposer2 = accounts[Constant.ADMIN_NUMBER + 3];
        const operator1 = accounts[Constant.ADMIN_NUMBER + 4];
        const operator2 = accounts[Constant.ADMIN_NUMBER + 5];
        const contributor1 = accounts[Constant.ADMIN_NUMBER + 6];
        const contributor2 = accounts[Constant.ADMIN_NUMBER + 7];
        const voter1 = accounts[Constant.ADMIN_NUMBER + 8];
        const voter2 = accounts[Constant.ADMIN_NUMBER + 9];
        const voter3 = accounts[Constant.ADMIN_NUMBER + 10];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 11];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 12];
        const manager = accounts[Constant.ADMIN_NUMBER + 13];
        const moderator = accounts[Constant.ADMIN_NUMBER + 14];

        const zone = ethers.utils.formatBytes32String("TestZone");

        const validator = new MockValidator(validatorWallet as any);

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const currency1 = await deployCurrency(deployer.address, "MockCurrency1", "MC1") as Currency;
        const currency2 = await deployCurrency(deployer.address, "MockCurrency2", "MC2") as Currency;
        const currencies = [currency1, currency2];

        const SmockGovernor = await smock.mock<Governor__factory>('Governor');
        const governor = await SmockGovernor.deploy();
        await governor.initialize(admin.address);

        const governanceHub = await deployGovernanceHub(
            deployer,
            admin.address,
            validator.getAddress(),
            CommonInitialization.GOVERNANCE_HUB_Fee,
        ) as GovernanceHub;

        const failReceiver = await deployFailReceiver(deployer.address, false, false) as FailReceiver;
        const reentrancyERC20 = await deployReentrancyERC20(deployer.address) as ReentrancyERC20;

        return {
            admin,
            governanceHub,
            governor,
            deployer,
            admins,
            validator,
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
            zone,
            currencies,
            failReceiver,
            reentrancyERC20,
        };
    };

    async function beforeGovernanceHubTest({
        skipDeclareZone = false,
        initGovernorTokens = false,
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
            admin, admins, governanceHub, governor, 
            contributor1, contributor2,
            voter1, voter2, voter3, 
            proposer1, proposer2, 
            operator1, operator2, 
            custodian1, custodian2,
            manager, moderator,
            zone,
            currencies,
            reentrancyERC20,
            failReceiver,
            validator,
        } = fixture;
        const fee = await governanceHub.fee();

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce(),
        );
        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce(),
        );
        await callAdmin_AuthorizeGovernor(
            admin,
            admins,
            [governor.address],
            true,
            await admin.nonce(),
        );

        if (!skipDeclareZone) {
            await callAdmin_DeclareZone(
                admin,
                admins,
                zone,
                await admin.nonce(),
            );
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address, moderator.address, operator1.address, operator2.address],
                true,
                await admin.nonce(),
            );
        }

        let timestamp = await time.latest() + 10;

        if (initGovernorTokens) {
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
            const params1: ProposeParams = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: useFailReceiverOperator ? failReceiver.address : operator1.address,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            }
            await callTransactionAtTimestamp(
                getProposeTx(
                    governanceHub,
                    validator,
                    proposer1,
                    params1,
                    { value: fee }
                ),
                timestamp,
            );

            timestamp += 10;

            const params2: ProposeParams = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(2),
                operator: operator2.address,
                uuid: ethers.utils.formatBytes32String("uuid_2"),
                rule: ProposalRule.DisapprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.75"),
                duration: 3000,
                admissionExpiry: timestamp + 4000,
            }
            await callTransactionAtTimestamp(
                getProposeTx(
                    governanceHub,
                    validator,
                    proposer2,
                    params2,
                    { value: fee }
                ),
                timestamp,
            );
        }

        if (admitSampleProposals) {
            const params1: AdmitParams = {
                proposalId: 1,
                contextURI: "metadata_uri_1",
                reviewURI: "state_uri_1",
                currency: ethers.constants.AddressZero,
            }
            await callTransaction(getAdmitTx(governanceHub, validator, custodian1, params1));

            const params2 = {
                proposalId: 2,
                contextURI: "metadata_uri_2",
                reviewURI: "state_uri_2",
                currency: useReentrancyERC20 ? reentrancyERC20.address : currencies[0].address,
            }
            await callTransaction(getAdmitTx(governanceHub, validator, custodian2, params2));
        }

        if (disqualifySampleProposals) {
            const params1: DisqualifyParams = {
                proposalId: 1,
                contextURI: "metadata_uri_1",
                reviewURI: "state_uri_1",
            }
            await callTransaction(getDisqualifyTx(governanceHub, validator, manager, params1));

            const params2: DisqualifyParams = {
                proposalId: 2,
                contextURI: "metadata_uri_2",
                reviewURI: "state_uri_2",
            }
            await callTransaction(getDisqualifyTx(governanceHub, validator, manager, params2));
        }

        await prepareERC20(
            currencies[0],
            [contributor1, contributor2],
            [governanceHub],
            ethers.utils.parseEther(String(1e9)),
        );

        await prepareNativeToken(
            ethers.provider,
            deployer,
            [failReceiver],
            ethers.utils.parseEther("10000"),
        );

        if (voteApprovalSampleProposals) {
            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval));
            await callTransaction(governanceHub.connect(voter2).vote(1, ProposalVoteOption.Approval));
            await callTransaction(governanceHub.connect(voter3).vote(1, ProposalVoteOption.Approval));

            await callTransaction(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Approval));
            await callTransaction(governanceHub.connect(voter2).vote(2, ProposalVoteOption.Approval));
        }

        if (voteDisapprovalSampleProposals) {
            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Disapproval));
            await callTransaction(governanceHub.connect(voter2).vote(1, ProposalVoteOption.Disapproval));
            await callTransaction(governanceHub.connect(voter3).vote(1, ProposalVoteOption.Disapproval));

            await callTransaction(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Disapproval));
            await callTransaction(governanceHub.connect(voter2).vote(2, ProposalVoteOption.Disapproval));
        }

        if (contributeBudgetSampleProposals) {
            if (useFailReceiverContributor) {
                await callTransaction(failReceiver.call(
                    governanceHub.address,
                    governanceHub.interface.encodeFunctionData("contributeBudget", [
                        1,
                        ethers.utils.parseEther("100"),
                    ]),
                    { value: ethers.utils.parseEther("100") }
                ));
            } else {
                await callTransaction(governanceHub.connect(contributor1).contributeBudget(
                    1,
                    ethers.utils.parseEther("100"),
                    { value: ethers.utils.parseEther("100") }
                ));
            }

            await callTransaction(governanceHub.connect(contributor2).contributeBudget(
                2,
                ethers.utils.parseEther("200"))
            );
        }

        if (confirmExecutionSampleProposals) {
            timestamp = (await governanceHub.getProposal(1)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(governanceHub.connect(manager).confirm(1));

            timestamp = (await governanceHub.getProposal(2)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(governanceHub.connect(manager).confirm(2));            
        }

        if (rejectExecutionSampleProposals) {
            timestamp = (await governanceHub.getProposal(1)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(governanceHub.connect(operator1).rejectExecution(1));

            timestamp = (await governanceHub.getProposal(2)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(governanceHub.connect(operator2).rejectExecution(2));
        }

        if (concludeExecutionSucceededSampleProposals) {
            const params1: ConcludeExecutionParams = {
                proposalId: 1,
                logURI: "state_uri_1",
                isSuccessful: true,
            }
            await callTransaction(getConcludeExecutionTx(governanceHub, validator, custodian1, params1));

            const params2: ConcludeExecutionParams = {
                proposalId: 2,
                logURI: "state_uri_2",
                isSuccessful: true,
            }
            await callTransaction(getConcludeExecutionTx(governanceHub, validator, custodian2, params2));
        }

        if (concludeExecutionFailedSampleProposals) {
            const params1: ConcludeExecutionParams = {
                proposalId: 1,
                logURI: "state_uri_1",
                isSuccessful: false,
            }
            await callTransaction(getConcludeExecutionTx(governanceHub, validator, custodian1, params1));
            
            const params2: ConcludeExecutionParams = {
                proposalId: 2,
                logURI: "state_uri_2",
                isSuccessful: false,
            }
            await callTransaction(getConcludeExecutionTx(governanceHub, validator, custodian2, params2));            
        }

        if (pause) {
            await callPausable_Pause(governanceHub, deployer, admins, admin);
        }

        return fixture;
    }

    describe('1.6.1. initialize(address, address, uint256)', async () => {
        it('1.6.1.1. init validator successfully after deploy', async () => {
            const { admin, validator, governanceHub } = await beforeGovernanceHubTest();

            const tx = governanceHub.deployTransaction;
            await expect(tx).to
                .emit(governanceHub, 'FeeUpdate').withArgs(CommonInitialization.GOVERNANCE_HUB_Fee);

            expect(await governanceHub.admin()).to.equal(admin.address);
            expect(await governanceHub.validator()).to.equal(validator.getAddress());
            expect(await governanceHub.fee()).to.equal(CommonInitialization.GOVERNANCE_HUB_Fee);
        });
    });

    describe('1.6.2. updateFee(uint256)', async () => {
        it('1.6.2.1. updateFee successfully with valid signatures', async () => {
            const { admin, admins, governanceHub } = await beforeGovernanceHubTest();

            const newFee = (await governanceHub.fee()).add(ethers.utils.parseEther("1"));

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [governanceHub.address, "updateFee", newFee]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await governanceHub.updateFee(newFee, signatures);
            await tx.wait();

            await expect(tx).to.emit(governanceHub, 'FeeUpdate').withArgs(newFee);

            expect(await governanceHub.fee()).to.equal(newFee);
        });

        it('1.6.2.2. updateFee unsuccessfully with invalid signatures', async () => {
            const { admin, admins, governanceHub } = await beforeGovernanceHubTest();

            const newFee = (await governanceHub.fee()).add(ethers.utils.parseEther("1"));

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [governanceHub.address, "updateFee", newFee]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(governanceHub.updateFee(newFee, invalidSignatures))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('1.6.3. getProposal(uint256)', async () => {
        it('1.6.3.1. return correct proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, governor, operator1, proposer1, validator } = fixture;

            let timestamp = await time.latest() + 10;

            const fee = await governanceHub.fee();
            const params = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            }
            const validation = await getProposeValidation(governanceHub, validator, proposer1, params);
            await callTransaction(governanceHub.connect(proposer1).propose(
                params.governor,
                params.tokenId,
                params.operator,
                params.uuid,
                params.rule,
                params.quorumRate,
                params.duration,
                params.admissionExpiry,
                validation,
                { value: fee }
            ));
            
            const proposal = await governanceHub.getProposal(1);
            expect(proposal.uuid).to.equal(params.uuid);
            expect(proposal.contextURI).to.equal("");
            expect(proposal.logURI).to.equal("");
            expect(proposal.governor).to.equal(params.governor);
            expect(proposal.tokenId).to.equal(params.tokenId);
            expect(proposal.totalWeight).to.equal(0);
            expect(proposal.approvalWeight).to.equal(0);
            expect(proposal.disapprovalWeight).to.equal(0);
            expect(proposal.quorum).to.equal(params.quorumRate);
            expect(proposal.proposer).to.equal(proposer1.address);
            expect(proposal.operator).to.equal(params.operator);
            expect(proposal.timePivot).to.equal(params.admissionExpiry);
            expect(proposal.due).to.equal(params.duration);
            expect(proposal.rule).to.equal(params.rule);
            expect(proposal.state).to.equal(ProposalState.Pending);
            expect(proposal.budget).to.equal(0);
            expect(proposal.currency).to.equal(ethers.constants.AddressZero);            
        });

        it('1.6.3.2. revert with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub } = fixture;
            
            await expectRevertWithModifierCustomError(
                governanceHub,
                governanceHub.getProposal(0),
                'InvalidProposalId'
            );
            
            await expectRevertWithModifierCustomError(
                governanceHub,
                governanceHub.getProposal(100),
                'InvalidProposalId'
            );
        });
    });

    describe('1.6.4. getProposalVerdict(uint256)', async () => {
        it('1.6.4.1. return unsettled verdict for pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Unsettled);
        });

        it('1.6.4.2. return passed verdict for executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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

        it('1.6.4.3. return passed verdict for successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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

        it('1.6.4.4. return passed verdict for unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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

        it('1.6.4.5. return failed verdict for disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.4.6. return failed verdict for rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.4.7. return passed verdict with enough approval votes for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2, voter3 } = fixture;

            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval));
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);

            await callTransaction(governanceHub.connect(voter3).vote(1, ProposalVoteOption.Approval));
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);

            await callTransaction(governanceHub.connect(voter2).vote(1, ProposalVoteOption.Disapproval));
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.4.8. return failed verdict with enough disapproval votes for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2, voter3 } = fixture;

            await callTransaction(governanceHub.connect(voter2).vote(1, ProposalVoteOption.Disapproval));
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);

            await callTransaction(governanceHub.connect(voter3).vote(1, ProposalVoteOption.Disapproval));
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);

            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval));
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.4.9. return failed verdict with not enough approval votes after due for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;
            
            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Disapproval));

            const due = (await governanceHub.getProposal(1)).due;
            await time.increaseTo(due);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.4.10. return unsettled verdict with not enough approval votes before due for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;
            
            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Disapproval));

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);
        });

        it('1.6.4.11. return failed verdict with enough disapproval votes for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2 } = fixture;

            await callTransaction(governanceHub.connect(voter2).vote(2, ProposalVoteOption.Disapproval));
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);

            await callTransaction(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Approval));
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);
        });

        it('1.6.4.12. return passed verdict with enough approval votes for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2 } = fixture;

            await callTransaction(governanceHub.connect(voter2).vote(2, ProposalVoteOption.Approval));
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);

            await callTransaction(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Disapproval));
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.4.13. return failed verdict with not enough disapproval votes after due for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Disapproval));

            const due = (await governanceHub.getProposal(2)).due;
            await time.increaseTo(due);

            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.4.14. return unsettled verdict with not enough disapproval votes before due for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Approval));

            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Unsettled);
        });

        it('1.6.4.15. revert with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub } = fixture;

            await expect(governanceHub.getProposalVerdict(0))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
            await expect(governanceHub.getProposalVerdict(100))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });
    });

    describe('1.6.5. getProposalState(uint256)', async () => {
        it('1.6.5.1. return disqualified state with confirmation overdue proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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

        it('1.6.5.2. return correct proposal state for pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Pending);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Pending);
        });

        it('1.6.5.3. return correct proposal state for voting proposal that is not confirming overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Voting);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Voting);
        });

        it('1.6.5.4. return correct proposal state for executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub } = fixture;
            
            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Executing);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Executing);
        });

        it('1.6.5.5. return correct proposal state for successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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

        it('1.6.5.6. return correct proposal state for unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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

        it('1.6.5.7. return correct proposal state for disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Disqualified);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Disqualified);
        });

        it('1.6.5.8. return correct proposal state for rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Rejected);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Rejected);
        });

        it('1.6.5.9. revert with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub } = fixture;

            await expect(governanceHub.getProposalState(0))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
            await expect(governanceHub.getProposalState(100))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });
    });

    describe('1.6.6. propose(address, uint256, address, bytes32, uint8, uint256, uint40, uint40, (uint256, uint256, bytes))', async () => {       
        async function beforeProposeTest(fixture: GovernanceHubFixture): Promise<{ defaultParams: ProposeParams }> {
            let timestamp = await time.latest() + 10;
            const { governor, operator1 } = fixture;
            const defaultParams = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: timestamp + 2000,                
            };
            return { defaultParams };
        }

        it('1.6.6.1. propose successfully with valid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, governor, operator1, operator2, proposer1, proposer2, validator } = fixture;
            
            const fee = await governanceHub.fee();
            let timestamp = await time.latest() + 10;

            // Tx1: Send just enough for fee
            let proposer1InitBalance = await ethers.provider.getBalance(proposer1.address);
            let governanceHubInitBalance = await ethers.provider.getBalance(governanceHub.address);

            const params1 = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            }
            await time.setNextBlockTimestamp(timestamp);
            const tx1 = await getProposeTx(
                governanceHub,
                validator,
                proposer1,
                params1,
                { value: fee }
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'NewProposal').withArgs(
                params1.governor,
                1,
                proposer1.address,
                params1.tokenId,
                params1.operator,
                params1.uuid,
                params1.rule,
                params1.quorumRate,
                params1.duration,
                params1.admissionExpiry,
            );

            expect(await ethers.provider.getBalance(proposer1.address)).to.equal(proposer1InitBalance.sub(fee).sub(gasFee1));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitBalance.add(fee));

            const proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.uuid).to.equal(params1.uuid);
            expect(proposal1.contextURI).to.equal("");
            expect(proposal1.logURI).to.equal("");
            expect(proposal1.governor).to.equal(params1.governor);
            expect(proposal1.tokenId).to.equal(params1.tokenId);
            expect(proposal1.totalWeight).to.equal(0);
            expect(proposal1.approvalWeight).to.equal(0);
            expect(proposal1.disapprovalWeight).to.equal(0);
            expect(proposal1.quorum).to.equal(params1.quorumRate);
            expect(proposal1.proposer).to.equal(proposer1.address);
            expect(proposal1.operator).to.equal(params1.operator);
            expect(proposal1.timePivot).to.equal(params1.admissionExpiry);
            expect(proposal1.due).to.equal(params1.duration);
            expect(proposal1.rule).to.equal(params1.rule);
            expect(proposal1.state).to.equal(ProposalState.Pending);
            expect(proposal1.budget).to.equal(0);
            expect(proposal1.currency).to.equal(ethers.constants.AddressZero);
            
            // Tx2: Send more than fee, need to be refunded
            timestamp += 10;
            let proposer2InitBalance = await ethers.provider.getBalance(proposer2.address);
            governanceHubInitBalance = await ethers.provider.getBalance(governanceHub.address);

            const params2 = {
                governor: governor.address,
                tokenId: ethers.BigNumber.from(1),
                operator: operator2.address,
                uuid: ethers.utils.formatBytes32String("uuid_2"),
                rule: ProposalRule.DisapprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.4"),
                duration: 3000,
                admissionExpiry: timestamp + 4000,
            }
            
            await time.setNextBlockTimestamp(timestamp);
            const tx2 = await getProposeTx(
                governanceHub,
                validator,
                proposer2,
                params2,
                { value: fee.add(ethers.utils.parseEther("1")) }
            );
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(governanceHub, 'NewProposal').withArgs(
                params2.governor,
                2,
                proposer2.address,
                params2.tokenId,
                params2.operator,
                params2.uuid,
                params2.rule,
                params2.quorumRate,
                params2.duration,
                params2.admissionExpiry,
            );

            expect(await ethers.provider.getBalance(proposer2.address)).to.equal(proposer2InitBalance.sub(fee).sub(gasFee2));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitBalance.add(fee));

            const proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.uuid).to.equal(params2.uuid);
            expect(proposal2.contextURI).to.equal("");
            expect(proposal2.logURI).to.equal("");
            expect(proposal2.governor).to.equal(params2.governor);
            expect(proposal2.tokenId).to.equal(params2.tokenId);
            expect(proposal2.totalWeight).to.equal(0);
            expect(proposal2.approvalWeight).to.equal(0);
            expect(proposal2.disapprovalWeight).to.equal(0);
            expect(proposal2.quorum).to.equal(params2.quorumRate);
            expect(proposal2.proposer).to.equal(proposer2.address);
            expect(proposal2.operator).to.equal(params2.operator);
            expect(proposal2.timePivot).to.equal(params2.admissionExpiry);
            expect(proposal2.due).to.equal(params2.duration);
            expect(proposal2.rule).to.equal(params2.rule);
            expect(proposal2.state).to.equal(ProposalState.Pending);
            expect(proposal2.budget).to.equal(0);
            expect(proposal2.currency).to.equal(ethers.constants.AddressZero);
        });

        it('1.6.6.2. propose unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, proposer1, validator } = fixture;

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            const validation = await getProposeInvalidValidation(governanceHub, validator, proposer1, defaultParams);

            await time.setNextBlockTimestamp(timestamp);
            await expect(governanceHub.connect(proposer1).propose(
                defaultParams.governor,
                defaultParams.tokenId,
                defaultParams.operator,
                defaultParams.uuid,
                defaultParams.rule,
                defaultParams.quorumRate,
                defaultParams.duration,
                defaultParams.admissionExpiry,
                validation,
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('1.6.6.3. propose unsuccessfully when not paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                pause: true,
            });
            const { governanceHub, proposer1, validator } = fixture;

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            const fee = await governanceHub.fee();

            await time.setNextBlockTimestamp(timestamp);
            await expect(getProposeTx(governanceHub, validator, proposer1, defaultParams, { value: fee }))
                .to.be.revertedWith('Pausable: paused');
        });
        
        it('1.6.6.4. propose unsuccessfully with invalid governor', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { admin, admins, proposer1, governor, governanceHub, validator } = fixture;

            await callAdmin_AuthorizeGovernor(
                admin,
                admins,
                [governor.address],
                false,
                await admin.nonce(),
            );

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            const fee = await governanceHub.fee();

            await time.setNextBlockTimestamp(timestamp);
            await expect(getProposeTx(governanceHub, validator, proposer1, defaultParams, { value: fee }))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.6.5. propose unsuccessfully with unavailable token', async () => {
            const fixture = await beforeGovernanceHubTest({
            });
            const { governanceHub, proposer1, validator } = fixture;

            const { defaultParams } = await beforeProposeTest(fixture);

            const fee = await governanceHub.fee();

            const params1: ProposeParams = {
                ...defaultParams,
                tokenId: ethers.BigNumber.from(0),
            }
            await expect(getProposeTx(governanceHub, validator, proposer1, params1, { value: fee }))
                .to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');

            const params2: ProposeParams = {
                ...defaultParams,
                tokenId: ethers.BigNumber.from(100),
            }
            await expect(getProposeTx(governanceHub, validator, proposer1, params2, { value: fee }))
                .to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.6.6. propose unsuccessfully with invalid quorum rate', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, proposer1, validator } = fixture;

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);
            const params: ProposeParams = {
                ...defaultParams,
                quorumRate: ethers.utils.parseEther("1").add(1),
            }

            const fee = await governanceHub.fee();

            await time.setNextBlockTimestamp(timestamp);
            await expect(getProposeTx(governanceHub, validator, proposer1, params, { value: fee }))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidInput');
        });
        
        it('1.6.6.7. propose unsuccessfully with invalid timestamp', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, proposer1, validator } = fixture;

            const { defaultParams } = await beforeProposeTest(fixture);
            
            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;
            const params: ProposeParams = {
                ...defaultParams,
                admissionExpiry: timestamp - 1,
            }

            await time.setNextBlockTimestamp(timestamp);
            await expect(getProposeTx(governanceHub, validator, proposer1, params, { value: fee }))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidTimestamp');
        });

        it('1.6.6.8. propose unsuccessfully when refund native token failed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { failReceiver, governanceHub, validator } = fixture;

            const fee = await governanceHub.fee();

            await callTransaction(failReceiver.activate(true));

            const { defaultParams } = await beforeProposeTest(fixture);

            await expect(getCallProposeTx(governanceHub, validator, failReceiver, defaultParams, { value: fee.mul(2) }))
                .to.be.revertedWithCustomError(governanceHub, 'FailedRefund');
        })

        it('1.6.6.9. propose unsuccessfully when reentrancy', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { proposer1, reentrancyERC20, governanceHub, deployer, governor, operator2, validator } = fixture;

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const { defaultParams } = await beforeProposeTest(fixture);
            
            const reentrancy = await deployReentrancy(deployer.address) as Reentrancy;
            
            const fee = await governanceHub.fee();
                        
            await testReentrancy_GovernanceHub(
                fixture,
                reentrancy,
                async () => {
                    await expect(getCallProposeTx(governanceHub, validator, reentrancy, defaultParams, { value: fee.mul(2) }))
                        .to.be.revertedWithCustomError(governanceHub, 'FailedRefund');
                }
            );
        });
    });

    describe('1.6.7. admit(uint256, string, string, address, (uint256, uint256, bytes))', async () => {
        async function beforeAdmitTest(fixture: GovernanceHubFixture): Promise<{defaultParams: AdmitParams}> {
            const defaultParams = {
                proposalId: 1,
                contextURI: "metadata_uri_1",
                reviewURI: "state_uri_1",
                currency: ethers.constants.AddressZero,
            }
            return { defaultParams };
        }

        it('1.6.7.1. admit successfully with valid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, governor, custodian1, custodian2, currencies, validator } = fixture;

            // Tx1: Sent by custodian
            const params1: AdmitParams = {
                proposalId: 1,
                contextURI: "metadata_uri_1",
                reviewURI: "state_uri_1",
                currency: ethers.constants.AddressZero,
            }

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const tokenId1 = 1;
            const totalWeight1 = await governor.totalEquityAt(tokenId1, timestamp);
            const quorumRate1 = (await governanceHub.getProposal(params1.proposalId)).quorum;
            const quorum1 = scale(totalWeight1, quorumRate1, Constant.COMMON_RATE_DECIMALS);
            const due1 = (await governanceHub.getProposal(params1.proposalId)).due;
            
            const tx1 = await getAdmitTx(governanceHub, validator, custodian1, params1);

            await expect(tx1).to.emit(governanceHub, 'ProposalAdmission').withArgs(
                params1.proposalId,                
                params1.contextURI,
                params1.reviewURI,
                params1.currency,
                totalWeight1,
                quorum1,
            );
            
            const proposal1 = await governanceHub.getProposal(params1.proposalId);
            expect(proposal1.contextURI).to.equal(params1.contextURI);
            expect(proposal1.logURI).to.equal(params1.reviewURI);
            expect(proposal1.totalWeight).to.equal(totalWeight1);
            expect(proposal1.quorum).to.equal(quorum1);
            expect(proposal1.timePivot).to.equal(timestamp);
            expect(proposal1.state).to.equal(ProposalState.Voting);
            expect(proposal1.currency).to.equal(params1.currency);
            expect(proposal1.due).to.equal(due1 + timestamp);

            // Tx2: Sent by moderator
            const params2: AdmitParams = {
                proposalId: 2,
                contextURI: "metadata_uri_2",
                reviewURI: "state_uri_2",
                currency: currencies[0].address,
            }

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tokenId2 = 2;
            const totalWeight2 = await governor.totalEquityAt(tokenId2, timestamp);
            const quorumRate2 = (await governanceHub.getProposal(params2.proposalId)).quorum;
            const quorum2 = scale(totalWeight2, quorumRate2, Constant.COMMON_RATE_DECIMALS);
            const due2 = (await governanceHub.getProposal(params2.proposalId)).due;

            const tx2 = await getAdmitTx(governanceHub, validator, custodian2, params2);

            await expect(tx2).to.emit(governanceHub, 'ProposalAdmission').withArgs(
                params2.proposalId,                
                params2.contextURI,
                params2.reviewURI,
                params2.currency,
                totalWeight2,
                quorum2,
            );
            
            const proposal2 = await governanceHub.getProposal(params2.proposalId);
            expect(proposal2.contextURI).to.equal(params2.contextURI);
            expect(proposal2.logURI).to.equal(params2.reviewURI);
            expect(proposal2.totalWeight).to.equal(totalWeight2);
            expect(proposal2.quorum).to.equal(quorum2);
            expect(proposal2.timePivot).to.equal(timestamp);
            expect(proposal2.state).to.equal(ProposalState.Voting);
            expect(proposal2.currency).to.equal(params2.currency);
            expect(proposal2.due).to.equal(due2 + timestamp);            
        });

        it('1.6.7.2. admit unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, custodian1, validator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            
            const validation = await getAdmitInvalidValidation(governanceHub, validator, defaultParams);
            await expect(governanceHub.connect(custodian1).admit(
                defaultParams.proposalId,
                defaultParams.contextURI,
                defaultParams.reviewURI,
                defaultParams.currency,
                validation,
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('1.6.7.3. admit unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, custodian1, custodian2, validator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            const params1: AdmitParams = {
                ...defaultParams,
                proposalId: 0,
            }
            await expect(getAdmitTx(governanceHub, validator, custodian1, params1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            const params2: AdmitParams = {
                ...defaultParams,
                proposalId: 100,
            }
            await expect(getAdmitTx(governanceHub, validator, custodian2, params2))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.7.4. admit unsuccessfully by unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, operator1, custodian2, validator, manager, moderator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            // Operator
            await expect(getAdmitTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Wrong custodian
            await expect(getAdmitTx(governanceHub, validator, custodian2, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Manager
            await expect(getAdmitTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Moderator
            await expect(getAdmitTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

        });

        it('1.6.7.5. admit unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                pause: true,
            });
            const { governanceHub, custodian1, validator } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.6.7.6. admit unsuccessfully with voting proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.7. admit unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.8. admit unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub, custodian1, validator } = fixture;
            
            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.9. admit unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;
            
            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.10. admit unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;
            
            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.11. admit unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub, validator, custodian1 } = fixture;
            
            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidAdmitting');
        });

        it('1.6.7.12. admit unsuccessfully with admission expired proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, custodian1, custodian2, validator } = fixture;

            const timePivot1 = (await governanceHub.getProposal(1)).timePivot;
            await time.setNextBlockTimestamp(timePivot1);

            const { defaultParams } = await beforeAdmitTest(fixture);
            const params1: AdmitParams = {
                ...defaultParams,
                proposalId: 1,
            }
            await expect(getAdmitTx(governanceHub, validator, custodian1, params1))
                .to.be.revertedWithCustomError(governanceHub, 'Timeout');

            const timePivot2 = (await governanceHub.getProposal(2)).timePivot;
            await time.setNextBlockTimestamp(timePivot2 + 1);

            const params2: AdmitParams = {
                ...defaultParams,
                proposalId: 2,
            }
            await expect(getAdmitTx(governanceHub, validator, custodian2, params2))
                .to.be.revertedWithCustomError(governanceHub, 'Timeout');
        });

        it('1.6.7.13. admit unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, governor, custodian1, validator } = fixture;

            governor.isAvailable.whenCalledWith(1).returns(false);

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');                
        });

        it('1.6.7.16. admit unsuccessfully when token have zero total vote power', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, governor, custodian1, validator } = fixture;

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            governor.totalEquityAt.whenCalledWith(1, timestamp).returns(0);

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expect(getAdmitTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'NoVotingPower');
        });
    });

    describe('1.6.8. disqualify(uint256, string, string, (uint256, uint256, bytes))', async () => {
        async function beforeDisqualifyTest(fixture: GovernanceHubFixture): Promise<{defaultParams: DisqualifyParams}> {
            const defaultParams: DisqualifyParams = {
                proposalId: 1,
                contextURI: 'metadata_uri_1',
                reviewURI: 'state_uri_1',
            };
            return { defaultParams };
        }

        it('1.6.8.1. disqualify pending proposal successfully by manager or representative during pending state', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, manager, custodian2, validator } = fixture;

            const params1: DisqualifyParams = {
                proposalId: 1,
                contextURI: 'metadata_uri_1',
                reviewURI: 'state_uri_1',
            };

            // Tx1: Disqualify by manager
            const tx1 = await getDisqualifyTx(governanceHub, validator, manager, params1);
            await expect(tx1).to.emit(governanceHub, 'ProposalDisqualification').withArgs(
                params1.proposalId,
                params1.contextURI,
                params1.reviewURI,
            );

            const proposal1 = await governanceHub.getProposal(params1.proposalId);
            expect(proposal1.contextURI).to.equal(params1.contextURI);
            expect(proposal1.logURI).to.equal(params1.reviewURI);
            expect(proposal1.state).to.equal(ProposalState.Disqualified);

            const params2: DisqualifyParams = {
                proposalId: 2,
                contextURI: 'metadata_uri_2',
                reviewURI: 'state_uri_2',
            };

            // Tx2: Disqualify by custodian
            const tx2 = await getDisqualifyTx(governanceHub, validator, custodian2, params2);
            await expect(tx2).to.emit(governanceHub, 'ProposalDisqualification').withArgs(
                params2.proposalId,
                params2.contextURI,
                params2.reviewURI,
            );

            const proposal2 = await governanceHub.getProposal(params2.proposalId);
            expect(proposal2.contextURI).to.equal(params2.contextURI);
            expect(proposal2.logURI).to.equal(params2.reviewURI);
            expect(proposal2.state).to.equal(ProposalState.Disqualified);
        });

        it('1.6.8.2. disqualify voting proposal successfully by manager during voting state', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, manager, validator } = fixture;

            const params: DisqualifyParams = {
                proposalId: 1,
                contextURI: 'metadata_uri_1',
                reviewURI: 'state_uri_1',
            };

            const tx = await getDisqualifyTx(governanceHub, validator, manager, params);
            await expect(tx).to.emit(governanceHub, 'ProposalDisqualification').withArgs(
                params.proposalId,
                params.contextURI,
                params.reviewURI,
            );

            const proposal1 = await governanceHub.getProposal(params.proposalId);
            expect(proposal1.contextURI).to.equal(params.contextURI);
            expect(proposal1.logURI).to.equal(params.reviewURI);
            expect(proposal1.state).to.equal(ProposalState.Disqualified);
        });

        it('1.6.8.3. disqualify unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, manager, validator } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            const validation = await getDisqualifyInvalidValidation(governanceHub, validator, defaultParams);

            await expect(governanceHub.connect(manager).disqualify(
                defaultParams.proposalId,
                defaultParams.contextURI,
                defaultParams.reviewURI,
                validation
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('1.6.8.4. disqualify unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { manager, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            const params1: DisqualifyParams = {
                ...defaultParams,
                proposalId: 0,
            }
            await expect(getDisqualifyTx(governanceHub, validator, manager, params1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            const params2: DisqualifyParams = {
                ...defaultParams,
                proposalId: 100,
            }
            await expect(getDisqualifyTx(governanceHub, validator, manager, params2))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.8.5. disqualify unsuccessfully when zone is not active', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                skipDeclareZone: true,
            });
            const { manager, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(getDisqualifyTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');                
        });

        it('1.6.8.6. disqualify unsuccessfully when sender is not active in zone', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { admin, admins, manager, zone, governanceHub, validator } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce(),
            );

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(getDisqualifyTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.7. disqualify unsuccessfully by unauthorized sender for pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, validator, moderator, operator1, custodian2 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);

            await expect(getDisqualifyTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Wrong custodian
            await expect(getDisqualifyTx(governanceHub, validator, custodian2, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.8. disqualify unsuccessfully by non-mananger for voting proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,                
            });
            const { governanceHub, validator, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(getDisqualifyTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });
        
        it('1.6.8.9. disqualify unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(getDisqualifyTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.10. disqualify unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(getDisqualifyTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.11. disqualify unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(getDisqualifyTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.12. disqualify unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(getDisqualifyTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.8.13. disqualify unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub, validator, manager, moderator, custodian1, operator1 } = fixture;

            const { defaultParams } = await beforeDisqualifyTest(fixture);
            await expect(getDisqualifyTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getDisqualifyTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });
    });

    describe('1.6.9. vote(uint256, uint8)', async () => {
        it('1.6.9.1. vote successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, governor, voter1, voter2, voter3 } = fixture;

            // Tx1: Approval vote
            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const totalWeight = await governor.totalEquityAt(1, timestamp);
            const weight1 = await governor.equityOfAt(voter1.address, 1, timestamp);
            const weight2 = await governor.equityOfAt(voter2.address, 1, timestamp);
            const weight3 = await governor.equityOfAt(voter3.address, 1, timestamp);

            const tx1 = await governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval);
            await tx1.wait();

            await expect(tx1).to.emit(governanceHub, 'ProposalVote').withArgs(
                1,
                voter1.address,
                ProposalVoteOption.Approval,
                weight1,
            );

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
            
            const tx2 = await governanceHub.connect(voter2).vote(1, ProposalVoteOption.Disapproval);
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalVote').withArgs(
                1,
                voter2.address,
                ProposalVoteOption.Disapproval,
                weight2,
            );

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

            const tx3 = await governanceHub.connect(voter3).vote(1, ProposalVoteOption.Approval);
            await tx3.wait();

            await expect(tx3).to.emit(governanceHub, 'ProposalVote').withArgs(
                1,
                voter3.address,
                ProposalVoteOption.Approval,
                weight3,
            );

            proposal = await governanceHub.getProposal(1);
            expect(proposal.totalWeight).to.equal(totalWeight);
            expect(proposal.approvalWeight).to.equal(weight1.add(weight3));
            expect(proposal.disapprovalWeight).to.equal(weight2);            

            voteOption = await governanceHub.voteOptions(1, voter3.address);
            expect(voteOption).to.equal(ProposalVoteOption.Approval);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.9.2. vote unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, voter1, voter2 } = fixture;

            await expect(governanceHub.connect(voter1).vote(0, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
            await expect(governanceHub.connect(voter2).vote(100, ProposalVoteOption.Disapproval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
            
        });

        it('1.6.9.3. vote unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                pause: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.6.9.4. vote unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, voter1, voter2 } = fixture;

            await expect(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
            await expect(governanceHub.connect(voter2).vote(2, ProposalVoteOption.Disapproval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.5. vote unsuccessfully when proposal is executing', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(governanceHub.connect(voter3).vote(2, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.6. vote unsuccessfully when proposal is successfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(governanceHub.connect(voter3).vote(2, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.7. vote unsuccessfully when proposal is unsuccessfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(governanceHub.connect(voter3).vote(2, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });
        
        it('1.6.9.8. vote unsuccessfully when proposal is disqualified', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(governanceHub.connect(voter3).vote(2, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.9. vote unsuccessfully when proposal is rejected', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub, voter3 } = fixture;

            await expect(governanceHub.connect(voter3).vote(2, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidVoting');
        });

        it('1.6.9.10. vote unsuccessfully when voting is overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, voter1 } = fixture;

            let due = (await governanceHub.getProposal(1)).due;
            await time.setNextBlockTimestamp(due);

            await expect(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'Overdue');

            due += 10;
            await time.setNextBlockTimestamp(due);

            await expect(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'Overdue');
        });

        it('1.6.9.11. vote unsuccessfully when sender already voted', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval));

            await expect(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'AlreadyVoted');
            await expect(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Disapproval))
                .to.be.revertedWithCustomError(governanceHub, 'AlreadyVoted');
        });

        it('1.6.9.12. vote unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, governor } = fixture;

            governor.isAvailable.whenCalledWith(1).returns(false);
            governor.isAvailable.whenCalledWith(2).returns(false);

            await expect(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
            await expect(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Disapproval))
                .to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.9.13. vote unsuccessfully when sender has no vote power', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, proposer2 } = fixture;
            
            await expect(governanceHub.connect(proposer2).vote(1, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'NoVotingPower');
        });

        it('1.6.9.14. vote unsuccessfully when sum of vote exceed total vote power', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, governor, voter1, voter2, voter3 } = fixture;

            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval));
            await callTransaction(governanceHub.connect(voter2).vote(1, ProposalVoteOption.Disapproval));

            let timestamp = (await governanceHub.getProposal(1)).timePivot;

            const voter3Vote = await governor.equityOfAt(voter3.address, 1, timestamp);
            governor.equityOfAt.whenCalledWith(voter3.address, 1, timestamp).returns(voter3Vote.add(1));

            await expect(governanceHub.connect(voter3).vote(1, ProposalVoteOption.Approval))
                .to.be.revertedWithCustomError(governanceHub, 'ConflictedWeight');
            await expect(governanceHub.connect(voter3).vote(1, ProposalVoteOption.Disapproval))
                .to.be.revertedWithCustomError(governanceHub, 'ConflictedWeight');

            governor.equityOfAt.reset();
        }); 
    });

    describe('1.6.10. safeVote(uint256, uint8, bytes32)', async () => {
        it('1.6.10.1. safe vote successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, governor, voter1, voter2, voter3 } = fixture;

            // Tx1: Approval vote
            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const totalWeight = await governor.totalEquityAt(1, timestamp);
            const weight1 = await governor.equityOfAt(voter1.address, 1, timestamp);
            const weight2 = await governor.equityOfAt(voter2.address, 1, timestamp);
            const weight3 = await governor.equityOfAt(voter3.address, 1, timestamp);

            const tx1 = await governanceHub.connect(voter1).safeVote(
                1,
                ProposalVoteOption.Approval,
                (await governanceHub.getProposal(1)).uuid,
            );
            await tx1.wait();

            await expect(tx1).to.emit(governanceHub, 'ProposalVote').withArgs(
                1,
                voter1.address,
                ProposalVoteOption.Approval,
                weight1,
            );

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
            
            const tx2 = await governanceHub.connect(voter2).safeVote(
                1,
                ProposalVoteOption.Disapproval,
                (await governanceHub.getProposal(1)).uuid,
            );
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalVote').withArgs(
                1,
                voter2.address,
                ProposalVoteOption.Disapproval,
                weight2,
            );

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

            const tx3 = await governanceHub.connect(voter3).safeVote(
                1,
                ProposalVoteOption.Approval,
                (await governanceHub.getProposal(1)).uuid,
            );
            await tx3.wait();

            await expect(tx3).to.emit(governanceHub, 'ProposalVote').withArgs(
                1,
                voter3.address,
                ProposalVoteOption.Approval,
                weight3,
            );

            proposal = await governanceHub.getProposal(1);
            expect(proposal.totalWeight).to.equal(totalWeight);
            expect(proposal.approvalWeight).to.equal(weight1.add(weight3));
            expect(proposal.disapprovalWeight).to.equal(weight2);            

            voteOption = await governanceHub.voteOptions(1, voter3.address);
            expect(voteOption).to.equal(ProposalVoteOption.Approval);

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
        });

        it('1.6.10.2. safe vote unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).safeVote(
                1,
                ProposalVoteOption.Approval,
                ethers.utils.formatBytes32String("Blockchain"),
            )).to.be.revertedWithCustomError(governanceHub, 'BadAnchor');
        });

        it('1.6.10.3. safe vote unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).safeVote(
                0,
                ProposalVoteOption.Approval,
                ethers.utils.formatBytes32String("Blockchain"),
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.10.4. safe vote unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                pause: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).safeVote(
                1,
                ProposalVoteOption.Approval,
                (await governanceHub.getProposal(1)).uuid,
            )).to.be.revertedWith('Pausable: paused');
        });    
    });

    describe('1.6.11. contributeBudget(uint256, uint256)', async () => {
        it('1.6.11.1. contribute budget successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, proposer2, currencies } = fixture;

            // Tx1: Contribution by token holder with native token
            let governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let voter1InitNativeBalance = await ethers.provider.getBalance(voter1.address);

            const value1 = ethers.utils.parseEther("1");
            const tx1 = await governanceHub.connect(voter1).contributeBudget(
                1,
                value1,
                { value: value1 },
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalBudgetContribution').withArgs(
                1,
                voter1.address,
                value1
            );

            let proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.budget).to.equal(value1);
            expect(await governanceHub.contributions(1, voter1.address)).to.equal(value1);

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitNativeBalance.add(value1));
            expect(await ethers.provider.getBalance(voter1.address)).to.equal(voter1InitNativeBalance.sub(value1).sub(gasFee1));
            
            // Tx2: Contribution by token holder with native token, need to refund exceed amount
            voter1InitNativeBalance = await ethers.provider.getBalance(voter1.address);
            governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const value2 = ethers.utils.parseEther("2");
            const tx2 = await governanceHub.connect(voter1).contributeBudget(
                1,
                value2,
                { value: value2.add(1) },
            );
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(governanceHub, 'ProposalBudgetContribution').withArgs(
                1,
                voter1.address,
                value2
            );

            proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.budget).to.equal(value1.add(value2));
            expect(await governanceHub.contributions(1, voter1.address)).to.equal(value1.add(value2));

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitNativeBalance.add(value2));
            expect(await ethers.provider.getBalance(voter1.address)).to.equal(voter1InitNativeBalance.sub(value2).sub(gasFee2));

            // Tx3: Contribution by non token holder with native token
            let proposer2InitNativeBalance = await ethers.provider.getBalance(proposer2.address);
            governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const value3 = ethers.utils.parseEther("4");
            const tx3 = await governanceHub.connect(proposer2).contributeBudget(
                1,
                value3,
                { value: value3 },
            );
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);

            await expect(tx3).to.emit(governanceHub, 'ProposalBudgetContribution').withArgs(
                1,
                proposer2.address,
                value3
            );

            proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.budget).to.equal(value1.add(value2).add(value3));
            expect(await governanceHub.contributions(1, proposer2.address)).to.equal(value3);

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitNativeBalance.add(value3));
            expect(await ethers.provider.getBalance(proposer2.address)).to.equal(proposer2InitNativeBalance.sub(value3).sub(gasFee3));

            // Tx4: Contribution by token holder with erc20
            const currency = currencies[0];
            await prepareERC20(
                currency,
                [voter1, proposer2],
                [governanceHub],
                ethers.utils.parseEther(String(1e9)),
            )

            let voter1InitERC20Balance = await currency.balanceOf(voter1.address);
            let governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);

            const value4 = ethers.utils.parseEther("8");
            const tx4 = await governanceHub.connect(voter1).contributeBudget(
                2,
                value4,
            );
            await tx4.wait();

            await expect(tx4).to.emit(governanceHub, 'ProposalBudgetContribution').withArgs(
                2,
                voter1.address,
                value4
            );

            let proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.budget).to.equal(value4);
            expect(await governanceHub.contributions(2, voter1.address)).to.equal(value4);

            expect(await currency.balanceOf(voter1.address)).to.equal(voter1InitERC20Balance.sub(value4));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.add(value4));

            // Tx5: Contribution by same voter with erc20
            voter1InitERC20Balance = await currency.balanceOf(voter1.address);
            governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);

            const value5 = ethers.utils.parseEther("16");
            const tx5 = await governanceHub.connect(voter1).contributeBudget(
                2,
                value5,
            );
            await tx5.wait();

            await expect(tx5).to.emit(governanceHub, 'ProposalBudgetContribution').withArgs(
                2,
                voter1.address,
                value5
            );

            proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.budget).to.equal(value4.add(value5));
            expect(await governanceHub.contributions(2, voter1.address)).to.equal(value4.add(value5));

            expect(await currency.balanceOf(voter1.address)).to.equal(voter1InitERC20Balance.sub(value5));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.add(value5));

            // Tx6: Contribution by non token holder with erc20
            let proposer2InitERC20Balance = await currency.balanceOf(proposer2.address);
            governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);

            const value6 = ethers.utils.parseEther("32");
            const tx6 = await governanceHub.connect(proposer2).contributeBudget(
                2,
                value6,
            );
            await tx6.wait();

            await expect(tx6).to.emit(governanceHub, 'ProposalBudgetContribution').withArgs(
                2,
                proposer2.address,
                value6
            );

            proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.budget).to.equal(value4.add(value5).add(value6));
            expect(await governanceHub.contributions(2, proposer2.address)).to.equal(value6);

            expect(await currency.balanceOf(proposer2.address)).to.equal(proposer2InitERC20Balance.sub(value6));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.add(value6)); 
        });

        it('1.6.11.2. contribute budget unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).contributeBudget(
                0,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.11.3. contribute budget unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                pause: true,
            });
            const { governanceHub, voter1 } = fixture; 

            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWith('Pausable: paused');
        });

        it('1.6.11.4. contribute budget unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.5. contribute budget unsuccessfully when proposal is executing', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.6. contribute budget unsuccessfully when proposal is successfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.7. contribute budget unsuccessfully when proposal is unsuccessfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.8. contribute budget unsuccessfully when proposal is disqualified', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;  

            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.9. contribute budget unsuccessfully when proposal is rejected', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;  

            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidContributing');
        });

        it('1.6.11.10. contribute budget unsuccessfully when execution confirmation is overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            let timestamp = (await governanceHub.getProposal(1)).due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT;
            await time.setNextBlockTimestamp(timestamp);
            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'Timeout');

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);
            await expect(governanceHub.connect(voter1).contributeBudget(
                1,
                ethers.utils.parseEther("1"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'Timeout');
        });

        it('1.6.11.11. contribute budget unsuccessfully when contract is reentered', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                useReentrancyERC20: true,
            });

            const { proposer1, reentrancyERC20, governanceHub } = fixture;

            await testReentrancy_GovernanceHub(
                fixture,
                reentrancyERC20,
                async () => {
                    await expect(governanceHub.connect(proposer1).contributeBudget(
                        2,
                        ethers.utils.parseEther("1"),
                    )).to.be.revertedWith("ReentrancyGuard: reentrant call");
                }
            );
        });
    });

    describe('1.6.12. safeContributeBudget(uint256, uint256, bytes32)', async () => {
        it('1.6.12.1. safe contribute budget successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, proposer2, currencies } = fixture;

            let governanceHubInitNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let voter1InitNativeBalance = await ethers.provider.getBalance(voter1.address);

            const value1 = ethers.utils.parseEther("1");
            const tx1 = await governanceHub.connect(voter1).safeContributeBudget(
                1,
                value1,
                (await governanceHub.getProposal(1)).uuid,
                { value: value1 },
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalBudgetContribution').withArgs(
                1,
                voter1.address,
                value1
            );

            let proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.budget).to.equal(value1);
            expect(await governanceHub.contributions(1, voter1.address)).to.equal(value1);

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitNativeBalance.add(value1));
            expect(await ethers.provider.getBalance(voter1.address)).to.equal(voter1InitNativeBalance.sub(value1).sub(gasFee1));
        });

        it('1.6.12.2. safe contribute budget unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, proposer2, currencies } = fixture;
            
            await expect(governanceHub.connect(voter1).safeContributeBudget(
                1,
                ethers.utils.parseEther("1"),
                ethers.utils.formatBytes32String("Blockchain"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'BadAnchor');
        });

        it('1.6.12.3. safe contribute budget unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, voter1, proposer2, currencies } = fixture;

            await expect(governanceHub.connect(voter1).safeContributeBudget(
                0,
                ethers.utils.parseEther("1"),
                ethers.utils.formatBytes32String("Blockchain"),
                { value: ethers.utils.parseEther("1") },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });        
    });

    describe('1.6.13. withdrawBudgetContribution(uint256)', async () => {
        it('1.6.13.1. withdraw budget contribution successfully with failed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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
            const tx1 = await governanceHub.connect(contributor1).withdrawBudgetContribution(1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalBudgetContributionWithdrawal').withArgs(
                1,
                contributor1.address,
                value1,
            );

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitNativeBalance.sub(value1));
            expect(await ethers.provider.getBalance(contributor1.address)).to.equal(contributor1InitNativeBalance.add(value1).sub(gasFee1));
            expect(await governanceHub.contributions(1, contributor1.address)).to.equal(0);

            // Tx2: Withdraw budget contribution of erc20
            const currency = currencies[0];
            let governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);
            let contributor2InitERC20Balance = await currency.balanceOf(contributor2.address);

            const value2 = await governanceHub.contributions(2, contributor2.address);
            const tx2 = await governanceHub.connect(contributor2).withdrawBudgetContribution(2);
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalBudgetContributionWithdrawal').withArgs(
                2,
                contributor2.address,
                value2,
            );

            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.sub(value2));
            expect(await currency.balanceOf(contributor2.address)).to.equal(contributor2InitERC20Balance.add(value2));
            expect(await governanceHub.contributions(2, contributor2.address)).to.equal(0);
        });

        it('1.6.13.2. withdraw budget contribution successfully with confirmation overdue proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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
            const tx1 = await governanceHub.connect(contributor1).withdrawBudgetContribution(1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalBudgetContributionWithdrawal').withArgs(
                1,
                contributor1.address,
                value1,
            );

            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitNativeBalance.sub(value1));
            expect(await ethers.provider.getBalance(contributor1.address)).to.equal(contributor1InitNativeBalance.add(value1).sub(gasFee1));
            expect(await governanceHub.contributions(1, contributor1.address)).to.equal(0);

            // Tx2: Withdraw at slightly after overdue timestamp
            timestamp = (await governanceHub.getProposal(2)).due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT + 10;
            await time.setNextBlockTimestamp(timestamp);

            const currency = currencies[0];
            let governanceHubInitERC20Balance = await currency.balanceOf(governanceHub.address);
            let contributor2InitERC20Balance = await currency.balanceOf(contributor2.address);

            const value2 = await governanceHub.contributions(2, contributor2.address);
            const tx2 = await governanceHub.connect(contributor2).withdrawBudgetContribution(2);
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalBudgetContributionWithdrawal').withArgs(
                2,
                contributor2.address,
                value2,
            );

            expect(await currency.balanceOf(governanceHub.address)).to.equal(governanceHubInitERC20Balance.sub(value2));
            expect(await currency.balanceOf(contributor2.address)).to.equal(contributor2InitERC20Balance.add(value2));
            expect(await governanceHub.contributions(2, contributor2.address)).to.equal(0);
        });

        it('1.6.13.3. withdraw budget contribution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, contributor1 } = fixture;

            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(0))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(100))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.13.4. withdraw budget contribution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                pause: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(1))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.6.13.5. withdraw budget contribution unsuccessfully when contract is reentered', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                useReentrancyERC20: true,
            });

            const { reentrancyERC20, governanceHub, contributor2 } = fixture;

            await testReentrancy_GovernanceHub(
                fixture,
                reentrancyERC20,
                async () => {
                    await expect(governanceHub.connect(contributor2).withdrawBudgetContribution(2))
                        .to.be.revertedWith("ReentrancyGuard: reentrant call");
                }
            );
        });

        it('1.6.13.6. withdraw budget contribution unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.7. withdraw budget contribution unsuccessfully when proposal is executing', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,                
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');

        });

        it('1.6.13.8. withdraw budget contribution unsuccessfully when proposal is successfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.9. withdraw budget contribution unsuccessfully when proposal is unsuccessfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.10. withdraw budget contribution unsuccessfully when proposal is voting and execution confirmation is not overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidWithdrawing');
        });

        it('1.6.13.11. withdraw budget contribution unsuccessfully when sender did not contribute', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, proposer2 } = fixture;

            await expect(governanceHub.connect(proposer2).withdrawBudgetContribution(1))
                .to.be.revertedWithCustomError(governanceHub, 'NothingToWithdraw');
        });
        
        it('1.6.13.12. withdraw budget contribution unsuccessfully when sender already withdrawn contribution', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, contributor1 } = fixture;

            await callTransaction(governanceHub.connect(contributor1).withdrawBudgetContribution(1));

            await expect(governanceHub.connect(contributor1).withdrawBudgetContribution(1))
                .to.be.revertedWithCustomError(governanceHub, 'NothingToWithdraw');            
        });
        
        it('1.6.13.13. withdraw budget contribution unsuccessfully when sending native token failed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                useFailReceiverContributor: true,
            });

            const { governanceHub, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(failReceiver.call(
                governanceHub.address,
                governanceHub.interface.encodeFunctionData("withdrawBudgetContribution", [1])
            )).to.be.revertedWithCustomError(governanceHub, 'FailedTransfer');
        });
    });

    describe('1.6.14. confirm(uint256)', async () => {
        it('1.6.14.1. confirm execution successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
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

            const tx1 = await governanceHub.connect(manager).confirm(1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalConfirmation').withArgs(
                1,
                budget1
            );

            expect(await ethers.provider.getBalance(manager.address)).to.equal(initManagerNativeBalance.sub(gasFee1));
            expect(await ethers.provider.getBalance(operator1.address)).to.equal(initOperator1NativeBalance.add(budget1));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.sub(budget1));

            let proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.state).to.equal(ProposalState.Executing);

            // Tx2: confirm execution with erc20 budget
            const currency = currencies[0];
            let initManagerERC20Balance = await currency.balanceOf(manager.address);
            let initGovernanceHubERC20Balance = await currency.balanceOf(governanceHub.address);
            let initOperator2ERC20Balance = await currency.balanceOf(operator2.address);

            const budget2 = (await governanceHub.getProposal(2)).budget;
            
            const tx2 = await governanceHub.connect(manager).confirm(2);
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalConfirmation').withArgs(
                2,
                budget2
            );

            expect(await currency.balanceOf(manager.address)).to.equal(initManagerERC20Balance);
            expect(await currency.balanceOf(operator2.address)).to.equal(initOperator2ERC20Balance.add(budget2));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(initGovernanceHubERC20Balance.sub(budget2));

            let proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.state).to.equal(ProposalState.Executing);
        });

        it('1.6.14.2. confirm execution successfully with no budget', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
            });

            const { governanceHub, manager, operator1, operator2, currencies } = fixture;

            // Tx1: confirm execution with no budget
            let initManagerNativeBalance = await ethers.provider.getBalance(manager.address);
            let initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);
            let initOperator1NativeBalance = await ethers.provider.getBalance(operator1.address);

            const tx1 = await governanceHub.connect(manager).confirm(1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalConfirmation').withArgs(
                1,
                0
            );

            expect(await ethers.provider.getBalance(manager.address)).to.equal(initManagerNativeBalance.sub(gasFee1));
            expect(await ethers.provider.getBalance(operator1.address)).to.equal(initOperator1NativeBalance);
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance);

            let proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.state).to.equal(ProposalState.Executing);
        });

        it('1.6.14.3. confirm execution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(0))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
            await expect(governanceHub.connect(manager).confirm(100))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.14.4. confirm execution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                pause: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.6.14.5. confirm execution unsuccessfully when contract is reentered', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                useReentrancyERC20: true,
            });

            const { governanceHub, reentrancyERC20, manager } = fixture;

            await testReentrancy_GovernanceHub(
                fixture,
                reentrancyERC20,
                async () => {
                    await expect(governanceHub.connect(manager).confirm(2))
                        .to.be.revertedWith("ReentrancyGuard: reentrant call");
                }
            )
        });

        it('1.6.14.6. confirm execution unsuccessfully with unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, moderator, operator1, custodian1 } = fixture;

            await expect(governanceHub.connect(moderator).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(governanceHub.connect(operator1).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(governanceHub.connect(custodian1).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.14.7. confirm execution unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager, governor } = fixture;

            governor.isAvailable.whenCalledWith(1).returns(false);

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.14.9. confirm execution unsuccessfully when sender is inactive in zone', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, admin, admins, zone, manager } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,                
                [manager.address],
                false,
                await admin.nonce(),
            );

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.14.10. confirm execution unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.11. confirm execution unsuccessfully when proposal is executing', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,   
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.12. confirm execution unsuccessfully when proposal is successfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.13. confirm execution unsuccessfully when proposal is unsuccessfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });

        it('1.6.14.14. confirm execution unsuccessfully when proposal is disqualified', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConfirming');
        });
        
        it('1.6.14.15. confirm execution unsuccessfully when proposal is rejected', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, "InvalidConfirming");
        });
        
        it('1.6.14.16. confirm execution unsuccessfully when execution confirmation is overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            let timestamp = (await governanceHub.getProposal(1)).due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT;
            await time.setNextBlockTimestamp(timestamp);

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, "InvalidConfirming");
        });

        it('1.6.14.17. confirm execution unsuccessfully with failed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteDisapprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, "InvalidConfirming");
        });

        it('1.6.14.18. confirm execution unsuccessfully with unsettled proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                contributeBudgetSampleProposals: true,
            });

            const { governanceHub, manager } = fixture;

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, "InvalidConfirming");
        });
       
        it('1.6.14.19. confirm execution unsuccessfully when transfer to operator failed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                useFailReceiverOperator: true,
            });

            const { governanceHub, failReceiver, manager } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(governanceHub.connect(manager).confirm(1))
                .to.be.revertedWithCustomError(governanceHub, "FailedTransfer");
        });
    });

    describe('1.6.15. rejectExecution(uint256)', async () => {
        it('1.6.15.1. reject execution successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, operator1, operator2 } = fixture;

            const tx1 = await governanceHub.connect(operator1).rejectExecution(1);
            await tx1.wait();

            await expect(tx1).to.emit(governanceHub, 'ProposalExecutionRejection').withArgs(1);            

            const proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.state).to.equal(ProposalState.Rejected);

            const tx2 = await governanceHub.connect(operator2).rejectExecution(2);
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalExecutionRejection').withArgs(2);

            const proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.state).to.equal(ProposalState.Rejected);
        });

        it('1.6.15.2. reject execution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();

            const { governanceHub, operator1 } = fixture;

            await expect(governanceHub.connect(operator1).rejectExecution(0))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
            await expect(governanceHub.connect(operator1).rejectExecution(100))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.15.3. reject execution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                pause: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(governanceHub.connect(operator1).rejectExecution(1))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.6.15.4. reject execution unsuccessfully with unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, moderator, manager, custodian1, operator1, operator2 } = fixture;

            await expect(governanceHub.connect(moderator).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(governanceHub.connect(manager).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(governanceHub.connect(custodian1).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            // Wrong operator
            await expect(governanceHub.connect(operator2).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(governanceHub.connect(operator1).rejectExecution(2))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.15.5. reject execution unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(governanceHub.connect(operator1).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });

        it('1.6.15.6. reject execution unsuccessfully when proposal is executing', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(governanceHub.connect(operator1).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });
        
        it('1.6.15.7. reject execution unsuccessfully when proposal is successfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(governanceHub.connect(operator1).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });

        it('1.6.15.8. reject execution unsuccessfully when proposal is unsuccessfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(governanceHub.connect(operator1).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });
        
        it('1.6.15.9. reject execution unsuccessfully when proposal is disqualified', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(governanceHub.connect(operator1).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });
        
        it('1.6.15.10. reject execution unsuccessfully when proposal is rejected', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });

            const { governanceHub, operator1 } = fixture;

            await expect(governanceHub.connect(operator1).rejectExecution(1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidRejecting');
        });
    });

    describe('1.6.16. logExecution(uint256, string, (uint256, uint256, bytes))', async () => {
        async function beforeLogExecutionTest(fixture: GovernanceHubFixture): Promise<{ defaultParams: LogExecutionParams }> {
            const defaultParams = {
                proposalId: 1,
                logURI: "updated_state_uri_1",
            }
            return { defaultParams };
        }

        it('1.6.16.1. update execution successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                contributeBudgetSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, operator1, operator2, validator } = fixture;

            // Tx1: Operator 1
            const params1: LogExecutionParams = {
                proposalId: 1,
                logURI: "updated_state_uri_1",
            }
            const validation1 = await getLogExecutionValidation(governanceHub, validator, params1);

            const tx1 = await governanceHub.connect(operator1).logExecution(params1.proposalId, params1.logURI, validation1);
            await tx1.wait();

            await expect(tx1).to.emit(governanceHub, 'ProposalExecutionLog').withArgs(params1.proposalId, params1.logURI);

            const proposal1 = await governanceHub.getProposal(params1.proposalId);
            expect(proposal1.state).to.equal(ProposalState.Executing);
            expect(proposal1.logURI).to.equal(params1.logURI);

            // Tx2: Operator 2
            const params2: LogExecutionParams = {
                proposalId: 2,
                logURI: "updated_state_uri_2",
            }
            const validation2 = await getLogExecutionValidation(governanceHub, validator, params2);

            const tx2 = await governanceHub.connect(operator2).logExecution(params2.proposalId, params2.logURI, validation2);
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalExecutionLog').withArgs(params2.proposalId, params2.logURI);

            const proposal2 = await governanceHub.getProposal(params2.proposalId);
            expect(proposal2.state).to.equal(ProposalState.Executing);
            expect(proposal2.logURI).to.equal(params2.logURI);            
        });

        it('1.6.16.2. update execution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();

            const { operator1, operator2, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);            
            const params1: LogExecutionParams = {
                ...defaultParams,
                proposalId: 0,
            }
            await expect(getLogExecutionTx(governanceHub, validator, operator1, params1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            const params2: LogExecutionParams = {
                ...defaultParams,
                proposalId: 100,
            }
            await expect(getLogExecutionTx(governanceHub, validator, operator2, params2))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.16.3. update execution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                pause: true,
            });

            const { operator1, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(getLogExecutionTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.6.16.4. update execution unsuccessfully with unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { moderator, manager, operator1, operator2, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(getLogExecutionTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            await expect(getLogExecutionTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            const params1: LogExecutionParams = {
                ...defaultParams,
                proposalId: 1,
            }
            await expect(getLogExecutionTx(governanceHub, validator, operator2, params1))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            const params2: LogExecutionParams = {
                ...defaultParams,
                proposalId: 2,
            }
            await expect(getLogExecutionTx(governanceHub, validator, operator1, params2))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.16.5. update execution unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, operator1, validator } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);
            const validation = await getLogExecutionInvalidValidation(governanceHub, validator, defaultParams);

            await expect(governanceHub.connect(operator1).logExecution(
                defaultParams.proposalId,
                defaultParams.logURI,
                validation
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('1.6.16.6. update execution unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });
            
            const { operator1, governanceHub, validator, governor } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            governor.isAvailable.whenCalledWith(1).returns(false);

            await expect(getLogExecutionTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.16.6. update execution unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(getLogExecutionTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.7. update execution unsuccessfully when proposal is voting', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(getLogExecutionTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.8. update execution unsuccessfully when proposal is successfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(getLogExecutionTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.9. update execution unsuccessfully when proposal is unsuccessfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(getLogExecutionTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.10. update execution unsuccessfully when proposal is disqualified', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(getLogExecutionTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });

        it('1.6.16.11. update execution unsuccessfully when proposal is rejected', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });

            const { governanceHub, validator, operator1 } = fixture;

            const { defaultParams } = await beforeLogExecutionTest(fixture);

            await expect(getLogExecutionTx(governanceHub, validator, operator1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidUpdating');
        });
    });

    describe('1.6.17. concludeExecution(uint256, string, bool, (uint256, uint256, bytes))', async () => {
        async function beforeConcludeExecutionTest(fixture: GovernanceHubFixture): Promise<{ defaultParams: ConcludeExecutionParams }> {
            const defaultParams: ConcludeExecutionParams = {
                proposalId: 1,
                logURI: "concluded_state_uri_1",
                isSuccessful: true,
            }
            return { defaultParams };
        }

        it('1.6.17.1. conclude execution successfully', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, validator, custodian1, custodian2 } = fixture;

            // Tx1: Conclude execution succeeded
            const params1: ConcludeExecutionParams = {
                proposalId: 1,
                logURI: "concluded_state_uri_1",
                isSuccessful: true,
            }

            const tx1 = await getConcludeExecutionTx(governanceHub, validator, custodian1, params1);
            await tx1.wait();

            await expect(tx1).to.emit(governanceHub, 'ProposalExecutionConclusion').withArgs(
                params1.proposalId,
                params1.logURI,
                params1.isSuccessful
            );

            const proposal1 = await governanceHub.getProposal(params1.proposalId);
            expect(proposal1.state).to.equal(ProposalState.SuccessfulExecuted);
            expect(proposal1.logURI).to.equal(params1.logURI);

            // Tx2: Conclude execution failed
            const params2: ConcludeExecutionParams = {
                proposalId: 2,
                logURI: "concluded_state_uri_2",
                isSuccessful: false,
            }

            const tx2 = await getConcludeExecutionTx(governanceHub, validator, custodian2, params2);
            await tx2.wait();

            await expect(tx2).to.emit(governanceHub, 'ProposalExecutionConclusion').withArgs(
                params2.proposalId,
                params2.logURI,
                params2.isSuccessful
            );
            
            const proposal2 = await governanceHub.getProposal(params2.proposalId);
            expect(proposal2.state).to.equal(ProposalState.UnsuccessfulExecuted);
            expect(proposal2.logURI).to.equal(params2.logURI);
        });

        it('1.6.17.2. conclude execution unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest();

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            const params1: ConcludeExecutionParams = {
                ...defaultParams,
                proposalId: 0,
            }
            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, params1))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');

            const params2: ConcludeExecutionParams = {
                ...defaultParams,
                proposalId: 100,
            }
            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, params2))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });

        it('1.6.17.3. conclude execution unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                pause: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);
            
            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.6.17.4. conclude execution unsuccessfully with unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { moderator, manager, custodian1, custodian2, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(getConcludeExecutionTx(governanceHub, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
            await expect(getConcludeExecutionTx(governanceHub, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            const params1: ConcludeExecutionParams = {
                ...defaultParams,
                proposalId: 1,
            }
            await expect(getConcludeExecutionTx(governanceHub, validator, custodian2, params1))
            .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');

            const params2: ConcludeExecutionParams = {
                ...defaultParams,
                proposalId: 2,
            }
            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, params2))
                .to.be.revertedWithCustomError(governanceHub, 'Unauthorized');
        });

        it('1.6.17.5. conclude execution unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);
            const validation = await getConcludeExecutionInvalidValidation(governanceHub, validator, defaultParams);

            await expect(governanceHub.connect(custodian1).concludeExecution(
                defaultParams.proposalId,
                defaultParams.logURI,
                defaultParams.isSuccessful,
                validation
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('1.6.17.6. conclude execution unsuccessfully with no longer available token', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
            });

            const { governanceHub, validator, governor, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            governor.isAvailable.whenCalledWith(1).returns(false);

            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'UnavailableToken');
        });

        it('1.6.17.8. conclude execution unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });
        
        it('1.6.17.9. conclude execution unsuccessfully when proposal is voting', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);
            
            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });

        it('1.6.17.10. conclude execution unsuccessfully when proposal is successfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });

        it('1.6.17.11. conclude execution unsuccessfully when proposal is unsuccessfully executed', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteApprovalSampleProposals: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);
            
            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });
        
        it('1.6.17.12. conclude execution unsuccessfully when proposal is disqualified', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);
            
            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });

        it('1.6.17.13. conclude execution unsuccessfully when proposal is rejected', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });

            const { governanceHub, validator, custodian1 } = fixture;

            const { defaultParams } = await beforeConcludeExecutionTest(fixture);

            await expect(getConcludeExecutionTx(governanceHub, validator, custodian1, defaultParams))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidConcluding');
        });
    });
});
