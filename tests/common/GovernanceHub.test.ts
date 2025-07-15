import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Admin,
    GovernanceHub,
    Governor,
    Governor__factory,
    Currency,
} from '@typechain-types';
import { callTransaction, getSignatures, getValidationMessage, prepareERC20, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployMockValidatable } from '@utils/deployments/mock/mockValidatable';
import { Validation } from '@utils/models/Validation';
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';
import { ProposalRule, ProposalState, ProposalVerdict, ProposalVoteOption } from '@utils/models/Proposal';
import { BigNumber, Wallet } from 'ethers';
import { MockContract, smock } from '@defi-wonderland/smock';
import { callAdmin_ActivateIn, callAdmin_AuthorizeGovernor, callAdmin_AuthorizeManagers, callAdmin_DeclareZones } from '@utils/callWithSignatures/admin';
import { callGovernanceHub_Pause } from '@utils/callWithSignatures/governanceHub';
import { MockValidator } from '@utils/mockValidator';
import { scale } from '@utils/utils';
import { deployCurrency } from '@utils/deployments/common/currency';

interface GovernanceHubFixture {
    admin: Admin;
    governanceHub: GovernanceHub;
    governor: MockContract<Governor>;
    currencies: Currency[];

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
    manager: any;
    moderator: any;
    zone: any;
}

interface ProposeParams {
    governor: string;
    tokenId: number;
    operator: string;
    uuid: string;
    rule: ProposalRule;
    quorumRate: BigNumber;
    duration: number;
    admissionExpiry: number;
}

interface AdmitParams {
    proposalId: number;
    metadataUri: string;
    stateUri: string;
    currency: string;
}

interface DisqualifyParams {
    proposalId: number;
    metadataUri: string;
    stateUri: string;
}

interface UpdateExecutionParams {
    proposalId: number;
    stateUri: string;
}

interface ConcludeExecutionParams {
    proposalId: number;
    stateUri: string;
    isSuccessful: boolean;    
}

async function getProposeValidation(
    fixture: GovernanceHubFixture,
    signer: Wallet,
    params: ProposeParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address", "bytes32", "address", "uint8", "uint256", "uint40", "uint40"],
        [params.governor, params.tokenId, signer.address, params.uuid, params.operator, params.rule, params.quorumRate, params.duration, params.admissionExpiry]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

async function getProposeInvalidValidation(
    fixture: GovernanceHubFixture,
    signer: Wallet,
    params: ProposeParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address", "bytes32", "address", "uint8", "uint256", "uint40", "uint40"],
        [params.governor, params.tokenId, signer.address, params.uuid, params.operator, params.rule, params.quorumRate, params.duration, params.admissionExpiry]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

async function getAdmitValidation(
    fixture: GovernanceHubFixture,
    params: AdmitParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string", "address"],
        [params.proposalId, params.metadataUri, params.stateUri, params.currency]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

async function getAdmitInvalidValidation(
    fixture: GovernanceHubFixture,
    params: AdmitParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string", "address"],
        [params.proposalId, params.metadataUri, params.stateUri, params.currency]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

async function getDisqualifyValidation(
    fixture: GovernanceHubFixture,
    params: DisqualifyParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string"],
        [params.proposalId, params.metadataUri, params.stateUri]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

async function getDisqualifyInvalidValidation(
    fixture: GovernanceHubFixture,
    params: DisqualifyParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string"],
        [params.proposalId, params.metadataUri, params.stateUri]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

async function getUpdateExecutionValidation(
    fixture: GovernanceHubFixture,
    params: UpdateExecutionParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.proposalId, params.stateUri]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

async function getUpdateExecutionInvalidValidation(
    fixture: GovernanceHubFixture,
    params: UpdateExecutionParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.proposalId, params.stateUri]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

async function getConcludeExecutionValidation(
    fixture: GovernanceHubFixture,
    params: ConcludeExecutionParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "bool"],
        [params.proposalId, params.stateUri, params.isSuccessful]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

async function getConcludeExecutionInvalidValidation(
    fixture: GovernanceHubFixture,
    params: ConcludeExecutionParams,
): Promise<Validation> {
    const { governanceHub, validator } = fixture;

    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "bool"],
        [params.proposalId, params.stateUri, params.isSuccessful]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

describe('24. GovernanceHub', async () => {
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
        const manager = accounts[Constant.ADMIN_NUMBER + 11];
        const moderator = accounts[Constant.ADMIN_NUMBER + 12];

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
            Constant.GOVERNANCE_HUB_FEE,
        ) as GovernanceHub;

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
            manager,
            moderator,
            zone,
            currencies,
        };
    };

    async function beforeGovernanceHubTest({
        initGovernorTokens = false,
        addSampleProposals = false,
        admitSampleProposals = false,
        disqualifySampleProposals = false,
        voteAndContributeBudget = false,
        confirmExecutionSampleProposals = false,
        rejectExecutionSampleProposals = false,
        concludeExecutionSucceededSampleProposals = false,
        concludeExecutionFailedSampleProposals = false,
        useFailReceiver = false,
        pause = false,
    } = {}): Promise<GovernanceHubFixture> {
        const fixture = await loadFixture(governanceHubFixture);
        const { 
            admin, admins, governanceHub, governor, 
            contributor1, contributor2,
            voter1, voter2, voter3, 
            proposer1, proposer2, 
            operator1, operator2, 
            manager, moderator,
            zone,
            currencies,
        } = fixture;
        const fee = await governanceHub.fee();

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce(),
        );
        await callAdmin_AuthorizeManagers(
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

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone],
            true,
            await admin.nonce(),
        );
        await callAdmin_ActivateIn(
            admin,
            admins,
            zone,
            [manager.address, moderator.address],
            true,
            await admin.nonce(),
        );

        let timestamp = await time.latest() + 10;

        if (initGovernorTokens) {
            await callTransaction(governor.setZone(1, zone));
            await callTransaction(governor.connect(voter1).mint(1, ethers.utils.parseEther('2')));
            await callTransaction(governor.connect(voter2).mint(1, ethers.utils.parseEther('3')));
            await callTransaction(governor.connect(voter3).mint(1, ethers.utils.parseEther('5')));

            await callTransaction(governor.setZone(2, zone));
            await callTransaction(governor.connect(voter1).mint(2, ethers.utils.parseEther('100')));
            await callTransaction(governor.connect(voter2).mint(2, ethers.utils.parseEther('300')));
        }

        if (addSampleProposals) {
            const params1 = {
                governor: governor.address,
                tokenId: 1,
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            }
            const validation1 = await getProposeValidation(fixture, proposer1, params1);

            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(governanceHub.connect(proposer1).propose(
                params1.governor,
                params1.tokenId,
                params1.operator,
                params1.uuid,
                params1.rule,
                params1.quorumRate,
                params1.duration,
                params1.admissionExpiry,
                validation1,
                { value: fee },
            ));

            timestamp += 10;

            const params2 = {
                governor: governor.address,
                tokenId: 2,
                operator: operator2.address,
                uuid: ethers.utils.formatBytes32String("uuid_2"),
                rule: ProposalRule.DisapprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.4"),
                duration: 3000,
                admissionExpiry: timestamp + 4000,
            }
            const validation2 = await getProposeValidation(fixture, proposer2, params2);

            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(governanceHub.connect(proposer2).propose(
                params2.governor,
                params2.tokenId,
                params2.operator,
                params2.uuid,
                params2.rule,
                params2.quorumRate,
                params2.duration,
                params2.admissionExpiry,
                validation2,
                { value: fee },
            ));
        }

        if (admitSampleProposals) {
            const params1 = {
                proposalId: 1,
                metadataUri: "metadata_uri_1",
                stateUri: "state_uri_1",
                currency: ethers.constants.AddressZero,
            }
            const validation1 = await getAdmitValidation(fixture, params1);

            await callTransaction(governanceHub.connect(manager).admit(
                params1.proposalId,
                params1.metadataUri,
                params1.stateUri,
                params1.currency,
                validation1,
            ));

            const params2 = {
                proposalId: 2,
                metadataUri: "metadata_uri_2",
                stateUri: "state_uri_2",
                currency: currencies[0].address,
            }
            const validation2 = await getAdmitValidation(fixture, params2);

            await callTransaction(governanceHub.connect(manager).admit(
                params2.proposalId,
                params2.metadataUri,
                params2.stateUri,
                params2.currency,
                validation2,
            ));
        }

        if (disqualifySampleProposals) {
            const params1 = {
                proposalId: 1,
                metadataUri: "metadata_uri_1",
                stateUri: "state_uri_1",
            }
            const validation1 = await getDisqualifyValidation(fixture, params1);

            await callTransaction(governanceHub.connect(moderator).disqualify(
                params1.proposalId,
                params1.metadataUri,
                params1.stateUri,
                validation1,
            ));

            const params2 = {
                proposalId: 2,
                metadataUri: "metadata_uri_2",
                stateUri: "state_uri_2",
            }
            const validation2 = await getDisqualifyValidation(fixture, params2);

            await callTransaction(governanceHub.connect(moderator).disqualify(
                params2.proposalId,
                params2.metadataUri,
                params2.stateUri,
                validation2,
            ));
        }

        await prepareERC20(
            currencies[0],
            [contributor1, contributor2],
            [governanceHub],
            ethers.utils.parseEther(String(1e9)),
        )

        if (voteAndContributeBudget) {
            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Approval));
            await callTransaction(governanceHub.connect(voter2).vote(1, ProposalVoteOption.Approval));
            await callTransaction(governanceHub.connect(voter3).vote(1, ProposalVoteOption.Approval));

            await callTransaction(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Approval));
            await callTransaction(governanceHub.connect(voter2).vote(2, ProposalVoteOption.Approval));

            await callTransaction(governanceHub.connect(contributor1).contributeBudget(
                1,
                ethers.utils.parseEther("100"),
                { value: ethers.utils.parseEther("100") }
            ));
            await callTransaction(governanceHub.connect(contributor2).contributeBudget(
                2,
                ethers.utils.parseEther("200"))
            );
        }

        if (confirmExecutionSampleProposals) {
            timestamp = (await governanceHub.getProposal(1)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(governanceHub.connect(manager).confirmExecution(1));

            timestamp = (await governanceHub.getProposal(2)).due;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(governanceHub.connect(manager).confirmExecution(2));            
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
            const params1 = {
                proposalId: 1,
                stateUri: "state_uri_1",
                isSuccessful: true,
            }
            const validation1 = await getConcludeExecutionValidation(fixture, params1);

            await callTransaction(governanceHub.connect(manager).concludeExecution(
                params1.proposalId,
                params1.stateUri,
                params1.isSuccessful,
                validation1,
            ));

            const params2 = {
                proposalId: 2,
                stateUri: "state_uri_2",
                isSuccessful: true,
            }
            const validation2 = await getConcludeExecutionValidation(fixture, params2);

            await callTransaction(governanceHub.connect(manager).concludeExecution(
                params2.proposalId,
                params2.stateUri,
                params2.isSuccessful,
                validation2,
            ));
        }

        if (concludeExecutionFailedSampleProposals) {
            const params1 = {
                proposalId: 1,
                stateUri: "state_uri_1",
                isSuccessful: false,
            }
            const validation1 = await getConcludeExecutionValidation(fixture, params1);
            
            await callTransaction(governanceHub.connect(manager).concludeExecution(
                params1.proposalId,
                params1.stateUri,
                params1.isSuccessful,
                validation1,
            ));

            const params2 = {
                proposalId: 2,
                stateUri: "state_uri_2",
                isSuccessful: false,
            }
            const validation2 = await getConcludeExecutionValidation(fixture, params2);
            await callTransaction(governanceHub.connect(manager).concludeExecution(
                params2.proposalId,
                params2.stateUri,
                params2.isSuccessful,
                validation2,
            ));
        }

        if (pause) {
            await callGovernanceHub_Pause(governanceHub, admins, await admin.nonce());
        }

        return fixture;
    }

    describe('24.1. initialize(address, address, uint256)', async () => {
        it('24.1.1. init validator successfully after deploy', async () => {
            const { admin, governanceHub, validator } = await beforeGovernanceHubTest();

            expect(await governanceHub.admin()).to.equal(admin.address);
            expect(await governanceHub.validator()).to.equal(validator.getAddress());
            expect(await governanceHub.fee()).to.equal(Constant.GOVERNANCE_HUB_FEE);
        });
    });

    describe('24.2. updateFee(uint256)', async () => {
        it('24.2.1. updateFee successfully with valid signatures', async () => {
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

        it('24.2.2. updateFee unsuccessfully with invalid signatures', async () => {
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

    describe('24.3. getProposal(uint256)', async () => {
        it('24.3.1. return correct proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, governor, operator1, proposer1 } = fixture;

            let timestamp = await time.latest() + 10;

            const fee = await governanceHub.fee();
            const params = {
                governor: governor.address,
                tokenId: 1,
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            }
            const validation = await getProposeValidation(fixture, proposer1, params);
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
            expect(proposal.metadataUri).to.equal("");
            expect(proposal.stateUri).to.equal("");
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

        it('24.3.2. revert with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub } = fixture;

            await expect(governanceHub.getProposal(0))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
            await expect(governanceHub.getProposal(100))
                .to.be.revertedWithCustomError(governanceHub, 'InvalidProposalId');
        });
    });

    describe('24.4. getProposalVerdict(uint256)', async () => {
        it('24.4.1. return unsettled verdict for pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Unsettled);
        });

        it('24.4.2. return passed verdict for executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('24.4.3. return passed verdict for successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('24.4.4. return passed verdict for unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Passed);
        });

        it('24.4.5. return failed verdict for disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Failed);
            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Failed);
        });

        it('24.4.6. return failed verdict for rejected proposal', async () => {
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

        it('24.4.8. return passed verdict with enough approval votes for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1, voter2, voter3 } = fixture;

            await callTransaction(governanceHub.connect(voter2).vote(1, ProposalVoteOption.Approval));
            await callTransaction(governanceHub.connect(voter3).vote(1, ProposalVoteOption.Approval));
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);

            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Disapproval));
            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Passed);
        });

        it('24.4.9. return failed verdict with not enough approval votes after due for approval beyond quorum rule', async () => {
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

        it('24.4.10. return unsettled verdict with not enough approval votes before due for approval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;
            
            await callTransaction(governanceHub.connect(voter1).vote(1, ProposalVoteOption.Disapproval));

            expect(await governanceHub.getProposalVerdict(1)).to.equal(ProposalVerdict.Unsettled);
        });

        it('24.4.11. return failed verdict with enough disapproval votes for disapproval beyond quorum rule', async () => {
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

        it('24.4.12. return failed verdict with not enough disapproval votes after due for disapproval beyond quorum rule', async () => {
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

        it('24.4.13. return unsettled verdict with not enough disapproval votes before due for disapproval beyond quorum rule', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub, voter1 } = fixture;

            await callTransaction(governanceHub.connect(voter1).vote(2, ProposalVoteOption.Approval));

            expect(await governanceHub.getProposalVerdict(2)).to.equal(ProposalVerdict.Unsettled);
        });

        it('24.4.14. revert with invalid proposal id', async () => {
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

    describe('24.5. getProposalState(uint256)', async () => {
        it('24.5.1. return disqualified state with confirmation overdue proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
            });
            const { governanceHub } = fixture;

            const proposal = await governanceHub.getProposal(1);
            const due = proposal.due;
            await time.increaseTo(due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT);
            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Disqualified);

            await time.increaseTo(due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT + 10);
            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Disqualified);
        });

        it('24.5.2. return correct proposal state for pending proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Pending);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Pending);
        });

        it('24.5.3. return correct proposal state for voting proposal that is not confirming overdue', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Voting);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Voting);
        });

        it('24.5.4. return correct proposal state for executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
            });
            const { governanceHub } = fixture;
            
            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Executing);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Executing);
        });

        it('24.5.5. return correct proposal state for successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.SuccessfulExecuted);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.SuccessfulExecuted);
        });

        it('24.5.6. return correct proposal state for unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.UnsuccessfulExecuted);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.UnsuccessfulExecuted);
        });

        it('24.5.7. return correct proposal state for disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { governanceHub } = fixture;

            expect(await governanceHub.getProposalState(1)).to.equal(ProposalState.Disqualified);
            expect(await governanceHub.getProposalState(2)).to.equal(ProposalState.Disqualified);
        });

        it('24.5.8. return correct proposal state for rejected proposal', async () => {
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

        it('24.5.9. revert with invalid proposal id', async () => {
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

    describe('24.6. propose(address, uint256, address, bytes32, uint8, uint256, uint40, uint40, (uint256, uint256, bytes))', async () => {
        async function expectRevertWithCustomError(
            fixture: GovernanceHubFixture,
            params: ProposeParams,
            signer: Wallet,
            error: string,
        ) {
            const { governanceHub } = fixture;
            const validation = await getProposeValidation(fixture, signer, params);

            await expect(governanceHub.connect(signer).propose(
                params.governor,
                params.tokenId,
                params.operator,
                params.uuid,
                params.rule,
                params.quorumRate,
                params.duration,
                params.admissionExpiry,
                validation,
            )).to.be.revertedWithCustomError(governanceHub, error);
        }

        async function expectRevert(
            fixture: GovernanceHubFixture,
            params: ProposeParams,
            signer: Wallet,
            error: string,
        ) {
            const { governanceHub } = fixture;
            const validation = await getProposeValidation(fixture, signer, params);

            await expect(governanceHub.connect(signer).propose(
                params.governor,
                params.tokenId,
                params.operator,
                params.uuid,
                params.rule,
                params.quorumRate,
                params.duration,
                params.admissionExpiry,
                validation,
            )).to.be.revertedWith(error);
        }

        async function beforeProposeTest(fixture: GovernanceHubFixture): Promise<{ defaultParams: ProposeParams }> {
            let timestamp = await time.latest() + 10;
            const { governor, operator1 } = fixture;
            const defaultParams = {
                governor: governor.address,
                tokenId: 1,
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: timestamp + 2000,                
            };
            return { defaultParams };
        }

        it('24.6.1. propose successfully with valid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, governor, operator1, operator2, proposer1, proposer2 } = fixture;
            
            const fee = await governanceHub.fee();
            let timestamp = await time.latest() + 10;

            // Tx1: Send just enough for fee
            let proposer1InitBalance = await ethers.provider.getBalance(proposer1.address);
            let governanceHubInitBalance = await ethers.provider.getBalance(governanceHub.address);

            const params1 = {
                governor: governor.address,
                tokenId: 1,
                operator: operator1.address,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: timestamp + 2000,
            }
            const validation1 = await getProposeValidation(fixture, proposer1, params1);

            await time.setNextBlockTimestamp(timestamp);
            const tx1 = await governanceHub.connect(proposer1).propose(
                params1.governor,
                params1.tokenId,
                params1.operator,
                params1.uuid,
                params1.rule,
                params1.quorumRate,
                params1.duration,
                params1.admissionExpiry,
                validation1,
                { value: fee },
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'NewProposal').withArgs(
                params1.governor,
                1,
                proposer1.address,
                params1.tokenId,
                params1.uuid,
                params1.operator,
                params1.rule,
                params1.quorumRate,
                params1.duration,
                params1.admissionExpiry,
            );

            expect(await ethers.provider.getBalance(proposer1.address)).to.equal(proposer1InitBalance.sub(fee).sub(gasFee1));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitBalance.add(fee));

            const proposal1 = await governanceHub.getProposal(1);
            expect(proposal1.uuid).to.equal(params1.uuid);
            expect(proposal1.metadataUri).to.equal("");
            expect(proposal1.stateUri).to.equal("");
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
                tokenId: 1,
                operator: operator2.address,
                uuid: ethers.utils.formatBytes32String("uuid_2"),
                rule: ProposalRule.DisapprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.4"),
                duration: 3000,
                admissionExpiry: timestamp + 4000,
            }
            const validation2 = await getProposeValidation(fixture, proposer2, params2);

            await time.setNextBlockTimestamp(timestamp);
            const tx2 = await governanceHub.connect(proposer2).propose(
                params2.governor,
                params2.tokenId,
                params2.operator,
                params2.uuid,
                params2.rule,
                params2.quorumRate,
                params2.duration,
                params2.admissionExpiry,
                validation2,
                { value: fee.add(ethers.utils.parseEther("1")) },
            );
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(governanceHub, 'NewProposal').withArgs(
                params2.governor,
                2,
                proposer2.address,
                params2.tokenId,
                params2.uuid,
                params2.operator,
                params2.rule,
                params2.quorumRate,
                params2.duration,
                params2.admissionExpiry,
            );

            expect(await ethers.provider.getBalance(proposer2.address)).to.equal(proposer2InitBalance.sub(fee).sub(gasFee2));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(governanceHubInitBalance.add(fee));

            const proposal2 = await governanceHub.getProposal(2);
            expect(proposal2.uuid).to.equal(params2.uuid);
            expect(proposal2.metadataUri).to.equal("");
            expect(proposal2.stateUri).to.equal("");
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

        it('24.6.2. propose unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { governanceHub, proposer1 } = fixture;

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            const validation = await getProposeInvalidValidation(fixture, proposer1, defaultParams);

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

        it('24.6.3. propose unsuccessfully when not paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                pause: true,
            });
            const { proposer1 } = fixture;

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            await time.setNextBlockTimestamp(timestamp);
            await expectRevert(
                fixture,
                defaultParams,
                proposer1,
                'Pausable: paused',
            );
        });
        
        it('24.6.4. propose unsuccessfully with invalid governor', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { admin, admins, proposer1, governor } = fixture;

            await callAdmin_AuthorizeGovernor(
                admin,
                admins,
                [governor.address],
                false,
                await admin.nonce(),
            );

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            await time.setNextBlockTimestamp(timestamp);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                proposer1,
                'InvalidGovernor',
            );
        });

        it('24.6.5. propose unsuccessfully with unavailable token id', async () => {
            const fixture = await beforeGovernanceHubTest({
            });
            const { proposer1 } = fixture;

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            await time.setNextBlockTimestamp(timestamp);
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, tokenId: 0 },
                proposer1,
                'InvalidTokenId',
            );
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, tokenId: 100 },
                proposer1,
                'InvalidTokenId',
            );
        });

        it('24.6.6. propose unsuccessfully with invalid quorum rate', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { proposer1 } = fixture;

            let timestamp = await time.latest() + 10;
            const { defaultParams } = await beforeProposeTest(fixture);

            await time.setNextBlockTimestamp(timestamp);
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, quorumRate: ethers.utils.parseEther("1").add(1) },
                proposer1,
                'InvalidInput',
            );
        });
        
        it('24.6.7. propose unsuccessfully with invalid timestamp', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { proposer1 } = fixture;

            const { defaultParams } = await beforeProposeTest(fixture);

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, admissionExpiry: timestamp - 1 },
                proposer1,
                'InvalidTimestamp',
            );
        });
    });

    describe('24.7. admit(uint256, string, string, address, (uint256, uint256, bytes))', async () => {
        async function beforeAdmitTest(fixture: GovernanceHubFixture): Promise<{defaultParams: AdmitParams}> {
            const defaultParams = {
                proposalId: 1,
                metadataUri: "metadata_uri_1",
                stateUri: "state_uri_1",
                currency: ethers.constants.AddressZero,
            }
            return { defaultParams };
        }

        async function expectRevertWithCustomError(
            fixture: GovernanceHubFixture,
            params: AdmitParams,
            signer: Wallet,
            error: string,
        ) {
            const { governanceHub } = fixture;
            const validation = await getAdmitValidation(fixture, params);
            await expect(governanceHub.connect(signer).admit(
                params.proposalId,
                params.metadataUri,
                params.stateUri,
                params.currency,
                validation,
            )).to.be.revertedWithCustomError(governanceHub, error);
        }

        async function expectRevert(
            fixture: GovernanceHubFixture,
            params: AdmitParams,
            signer: Wallet,
            error: string,
        ) {
            const { governanceHub } = fixture;
            const validation = await getAdmitValidation(fixture, params);
            await expect(governanceHub.connect(signer).admit(
                params.proposalId,
                params.metadataUri,
                params.stateUri,
                params.currency,
                validation,
            )).to.be.revertedWith(error);
        }

        it('24.7.1. admit successfully with valid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, governor, manager, moderator, currencies } = fixture;

            // Tx1: Sent by manager
            const params1 = {
                proposalId: 1,
                metadataUri: "metadata_uri_1",
                stateUri: "state_uri_1",
                currency: ethers.constants.AddressZero,
            }
            const validation1 = await getAdmitValidation(fixture, params1);

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const tokenId1 = 1;
            const totalWeight1 = await governor.totalVoteAt(tokenId1, timestamp);
            const quorumRate1 = (await governanceHub.getProposal(params1.proposalId)).quorum;
            const quorum1 = scale(totalWeight1, quorumRate1, Constant.COMMON_RATE_DECIMALS);
            const due1 = (await governanceHub.getProposal(params1.proposalId)).due;
            
            const tx1 = await governanceHub.connect(manager).admit(
                params1.proposalId,
                params1.metadataUri,
                params1.stateUri,
                params1.currency,
                validation1,
            );

            await expect(tx1).to.emit(governanceHub, 'ProposalAdmission').withArgs(
                params1.proposalId,                
                params1.metadataUri,
                params1.stateUri,
                totalWeight1,
                quorum1,
                timestamp,
                params1.currency,
            );
            
            const proposal1 = await governanceHub.getProposal(params1.proposalId);
            expect(proposal1.metadataUri).to.equal(params1.metadataUri);
            expect(proposal1.stateUri).to.equal(params1.stateUri);
            expect(proposal1.totalWeight).to.equal(totalWeight1);
            expect(proposal1.quorum).to.equal(quorum1);
            expect(proposal1.timePivot).to.equal(timestamp);
            expect(proposal1.state).to.equal(ProposalState.Voting);
            expect(proposal1.currency).to.equal(params1.currency);
            expect(proposal1.due).to.equal(due1 + timestamp);

            // Tx2: Sent by moderator
            const params2 = {
                proposalId: 2,
                metadataUri: "metadata_uri_2",
                stateUri: "state_uri_2",
                currency: currencies[0].address,
            }
            const validation2 = await getAdmitValidation(fixture, params2);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tokenId2 = 2;
            const totalWeight2 = await governor.totalVoteAt(tokenId2, timestamp);
            const quorumRate2 = (await governanceHub.getProposal(params2.proposalId)).quorum;
            const quorum2 = scale(totalWeight2, quorumRate2, Constant.COMMON_RATE_DECIMALS);
            const due2 = (await governanceHub.getProposal(params2.proposalId)).due;

            const tx2 = await governanceHub.connect(moderator).admit(
                params2.proposalId,
                params2.metadataUri,
                params2.stateUri,
                params2.currency,
                validation2,
            );

            await expect(tx2).to.emit(governanceHub, 'ProposalAdmission').withArgs(
                params2.proposalId,                
                params2.metadataUri,
                params2.stateUri,
                totalWeight2,
                quorum2,
                timestamp,
                params2.currency,
            );
            
            const proposal2 = await governanceHub.getProposal(params2.proposalId);
            expect(proposal2.metadataUri).to.equal(params2.metadataUri);
            expect(proposal2.stateUri).to.equal(params2.stateUri);
            expect(proposal2.totalWeight).to.equal(totalWeight2);
            expect(proposal2.quorum).to.equal(quorum2);
            expect(proposal2.timePivot).to.equal(timestamp);
            expect(proposal2.state).to.equal(ProposalState.Voting);
            expect(proposal2.currency).to.equal(params2.currency);
            expect(proposal2.due).to.equal(due2 + timestamp);            
        });

        it('24.7.2. admit unsuccessfully with invalid validation', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, manager } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            
            const validation = await getAdmitInvalidValidation(fixture, defaultParams);
            await expect(governanceHub.connect(manager).admit(
                defaultParams.proposalId,
                defaultParams.metadataUri,
                defaultParams.stateUri,
                defaultParams.currency,
                validation,
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('24.7.3. admit unsuccessfully with invalid proposal id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
            });
            const { manager } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, proposalId: 0 },
                manager,
                'InvalidProposalId',
            );
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, proposalId: 100 },
                manager,
                'InvalidProposalId',
            );
        });

        it('24.7.4. admit unsuccessfully by unauthorized sender', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { proposer1 } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                proposer1,
                'Unauthorized',
            );
        });

        it('24.7.5. admit unsuccessfully when paused', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                pause: true,
            });
            const { manager } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevert(
                fixture,
                defaultParams,
                manager,
                'Pausable: paused',
            );
        });

        it('24.7.6. admit unsuccessfully with voting proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
            });
            const { manager } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                'InvalidAdmitting',
            );
        });

        it('24.7.6. admit unsuccessfully with executing proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
            });
            const { manager } = fixture;

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                'InvalidAdmitting',
            );
        });

        it('24.7.7. admit unsuccessfully with successfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionSucceededSampleProposals: true,
            });
            const { manager } = fixture;
            
            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                'InvalidAdmitting',
            );
        });

        it('24.7.8. admit unsuccessfully with unsuccessfully executed proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                voteAndContributeBudget: true,
                confirmExecutionSampleProposals: true,
                concludeExecutionFailedSampleProposals: true,
            });
            const { manager } = fixture;
            
            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                'InvalidAdmitting',
            );
        });

        it('24.7.9. admit unsuccessfully with disqualified proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                disqualifySampleProposals: true,
            });
            const { manager } = fixture;
            
            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                'InvalidAdmitting',
            );
        });

        it('24.7.10. admit unsuccessfully with rejected proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
                admitSampleProposals: true,
                rejectExecutionSampleProposals: true,
            });
            const { manager } = fixture;
            
            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                'InvalidAdmitting',
            );
        });

        it('24.7.11. admit unsuccessfully with admission expired proposal', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governanceHub, manager } = fixture;

            const timePivot1 = (await governanceHub.getProposal(1)).timePivot;
            await time.setNextBlockTimestamp(timePivot1);

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, proposalId: 1 },
                manager,
                'Timeout',
            );

            const timePivot2 = (await governanceHub.getProposal(2)).timePivot;
            await time.setNextBlockTimestamp(timePivot2 + 1);

            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, proposalId: 2 },
                manager,
                'Timeout',
            );
        });

        it('24.7.12. admit unsuccessfully with no longer available token id', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governor, manager } = fixture;

            governor.isAvailable.whenCalledWith(1).returns(false);

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, proposalId: 1 },
                manager,
                'InvalidTokenId',
            );

            governor.isAvailable.reset();
        });

        it('24.7.13. admit unsuccessfully when zone is not active', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { admin, admins, manager, zone } = fixture;

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce(),
            );

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                'Unauthorized',
            );
        });

        it('24.7.14. admit unsuccessfully when sender is not active in zone', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { admin, admins, manager, zone } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce(),
            );

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                'Unauthorized',
            );
        });
        
        it('24.7.15. admit unsuccessfully when token have zero total vote power', async () => {
            const fixture = await beforeGovernanceHubTest({
                initGovernorTokens: true,
                addSampleProposals: true,
            });
            const { governor, manager } = fixture;

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            governor.totalVoteAt.whenCalledWith(1, timestamp).returns(0);

            const { defaultParams } = await beforeAdmitTest(fixture);
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, proposalId: 1 },
                manager,
                'NoVotingPower',
            );

            governor.isAvailable.reset();
        });
    });

    describe('24.8. disqualify(uint256, string, string, (uint256, uint256, bytes))', async () => {
        it('24.8.1. disqualify proposal successfully', async () => {

        });

        it('24.8.2. disqualify pending proposal successfully', async () => {

        });

        it('24.8.3. disqualify unsuccessfully with invalid validation', async () => {
            
        });

        it('24.8.4. disqualify unsuccessfully with invalid proposal id', async () => {

        });

        it('24.8.5. disqualify unsuccessfully when zone is not active', async () => {

        });

        it('24.8.6. disqualify unsuccessfully when sender is not active in zone', async () => {

        });

        it('24.8.7. disqualify unsuccessfully by non-executive for pending proposal', async () => {

        });

        it('24.8.8. disqualify unsuccessfully by non-mananger for voting proposal', async () => {

        });

        it('24.8.9. disqualify unsuccessfully by non-mananger for executing proposal', async () => {

        });

        it('24.8.10. disqualify unsuccessfully by non-mananger for successfully executed proposal', async () => {

        });

        it('24.8.11. disqualify unsuccessfully by non-mananger for unsuccessfully executed proposal', async () => {

        });

        it('24.8.12. disqualify unsuccessfully by non-mananger for disqualified proposal', async () => {

        });

        it('24.8.13. disqualify unsuccessfully by non-mananger for rejected proposal', async () => {

        });
    });

    describe('24.9. vote(uint256, uint8)', async () => {
        it('24.9.1. vote successfully', async () => {

        });

        it('24.9.2. vote unsuccessfully with invalid proposal id', async () => {

        });

        it('24.9.3. vote unsuccessfully when paused', async () => {

        });

        it('24.9.4. vote unsuccessfully when proposal is pending', async () => {

        });

        it('24.9.5. vote unsuccessfully when proposal is executing', async () => {

        });

        it('24.9.6. vote unsuccessfully when proposal is successfully executed', async () => {

        });

        it('24.9.7. vote unsuccessfully when proposal is unsuccessfully executed', async () => {

        });
        
        it('24.9.8. vote unsuccessfully when proposal is disqualified', async () => {

        });

        it('24.9.9. vote unsuccessfully when proposal is rejected', async () => {

        });

        it('24.9.10. vote unsuccessfully when voting is overdue', async () => {

        });

        it('24.9.11. vote unsuccessfully when sender already voted', async () => {

        });

        it('24.9.12. vote unsuccessfully when sender has no vote power', async () => {

        });

        it('24.9.13. vote unsuccessfully when sum of vote exceed total vote power', async () => {

        }); 
    });

    describe('24.10. safeVote(uint256, uint8, bytes32)', async () => {
        it('24.10.1. safe vote successfully', async () => {

        });

        it('24.10.2. safe vote unsuccessfully with invalid anchor', async () => {
            
        });

        it('24.10.3. safe vote unsuccessfully with invalid proposal id', async () => {

        });

        it('24.10.4. safe vote unsuccessfully when paused', async () => {

        });    
    });

    describe('24.11. contributeBudget(uint256, uint256)', async () => {
        it('24.11.1. contribute budget successfully', async () => {

        });

        it('24.11.2. contribute budget unsuccessfully with invalid proposal id', async () => {
            
        });

        it('24.11.3. contribute budget unsuccessfully when paused', async () => {

        });

        it('24.11.4. contribute budget unsuccessfully with invalid amount', async () => {

        });

        it('24.11.5. contribute budget unsuccessfully when proposal is pending', async () => {

        });

        it('24.11.6. contribute budget unsuccessfully when proposal is executing', async () => {

        });

        it('24.11.7. contribute budget unsuccessfully when proposal is successfully executed', async () => {

        });

        it('24.11.8. contribute budget unsuccessfully when proposal is unsuccessfully executed', async () => {

        });

        it('24.11.9. contribute budget unsuccessfully when proposal is disqualified', async () => {

        });

        it('24.11.10. contribute budget unsuccessfully when proposal is rejected', async () => {

        });

        it('24.11.11. contribute budget unsuccessfully when execution confirmation is overdue', async () => {

        });

        it('24.11.12. contribute budget unsuccessfully when contract is reentered', async () => {

        });
    });

    describe('24.12. safeContributeBudget(uint256, uint256, bytes32)', async () => {
        it('24.12.1. safe contribute budget successfully', async () => {

        });

        it('24.12.2. safe contribute budget unsuccessfully with invalid anchor', async () => {
            
        });

        it('24.12.3. safe contribute budget unsuccessfully with invalid proposal id', async () => {

        });        
    });

    describe('24.13. withdrawBudgetContribution(uint256)', async () => {
        it('24.13.1. withdraw budget contribution successfully with failed proposal', async () => {

        });

        it('24.13.2. withdraw budget contribution successfully with confirmation overdue proposal', async () => {

        });

        it('24.13.3. withdraw budget contribution unsuccessfully with invalid proposal id', async () => {

        });

        it('24.13.4. withdraw budget contribution unsuccessfully when paused', async () => {

        });

        it('24.13.5. withdraw budget contribution unsuccessfully when contract is reentered', async () => {

        });

        it('24.13.6. withdraw budget contribution unsuccessfully when proposal is pending', async () => {

        });

        it('24.13.7. withdraw budget contribution unsuccessfully when proposal is executing', async () => {

        });

        it('24.13.8. withdraw budget contribution unsuccessfully when proposal is successfully executed', async () => {

        });

        it('24.13.9. withdraw budget contribution unsuccessfully when proposal is unsuccessfully executed', async () => {

        });

        it('24.13.11. withdraw budget contribution unsuccessfully when proposal is voting and execution confirmation is not overdue', async () => {

        });

        it('24.13.12. withdraw budget contribution unsuccessfully when sender did not contribute', async () => {

        });
        
        it('24.13.13. withdraw budget contribution unsuccessfully when sender already withdrawn contribution', async () => {
            
        });
        
        it('24.13.14. withdraw budget contribution unsuccessfully when sending native token failed', async () => {

        });
    });

    describe('24.14. confirmExecution(uint256)', async () => {
        it('24.14.1. confirm execution successfully', async () => {

        });

        it('24.14.2. confirm execution unsuccessfully with invalid proposal id', async () => {
            
        });

        it('24.14.3. confirm execution unsuccessfully when paused', async () => {
            
        });

        it('24.14.4. confirm execution unsuccessfully when contract is reentered', async () => {

        });

        it('24.14.5. confirm execution unsuccessfully with unauthorized sender', async () => {

        });

        it('24.14.6. confirm execution unsuccessfully with inactive zone', async () => {

        });

        it('24.14.7. confirm execution unsuccessfully when sender is inactive in zone', async () => {

        });

        it('24.14.8. confirm execution unsuccessfully when proposal is pending', async () => {

        });

        it('24.14.9. confirm execution unsuccessfully when proposal is executing', async () => {

        });

        it('24.14.10. confirm execution unsuccessfully when proposal is successfully executed', async () => {

        });

        it('24.14.11. confirm execution unsuccessfully when proposal is unsuccessfully executed', async () => {

        });
        
        it('24.14.12. confirm execution unsuccessfully when proposal is disqualified', async () => {

        });
        
        it('24.14.13. confirm execution unsuccessfully when proposal is rejected', async () => {

        });
        
        it('24.14.14. confirm execution unsuccessfully when execution confirmation is overdue', async () => {

        });

        it('24.14.15. confirm execution unsuccessfully with failed or unsettled verdict proposal', async () => {

        });
       
        it('24.14.16. confirm execution unsuccessfully when transfer to operator failed', async () => {

        });
    });

    describe('24.15. rejectExecution(uint256)', async () => {
        it('24.15.1. reject execution successfully', async () => {

        });

        it('24.15.2. reject execution unsuccessfully with invalid proposal id', async () => {

        });

        it('24.15.3. reject execution unsuccessfully when paused', async () => {

        });

        it('24.15.4. reject execution unsuccessfully with unauthorized sender', async () => {

        });

        it('24.15.5. reject execution unsuccessfully when proposal is pending', async () => {

        });

        it('24.15.6. reject execution unsuccessfully when proposal is executing', async () => {

        });
        
        it('24.15.7. reject execution unsuccessfully when proposal is successfully executed', async () => {

        });

        it('24.15.8. reject execution unsuccessfully when proposal is unsuccessfully executed', async () => {

        });
        
        it('24.15.9. reject execution unsuccessfully when proposal is disqualified', async () => {

        });
        
        it('24.15.10. reject execution unsuccessfully when proposal is rejected', async () => {

        });
    });

    describe('24.16. updateExecution(uint256, string, (uint256, uint256, bytes))', async () => {
        it('24.16.1. update execution successfully', async () => {

        });

        it('24.16.2. update execution unsuccessfully with invalid proposal id', async () => {

        });

        it('24.16.3. update execution unsuccessfully when paused', async () => {

        });

        it('24.16.4. update execution unsuccessfully with unauthorized sender', async () => {

        });

        it('24.16.5. update execution unsuccessfully with invalid validation', async () => {

        });

        it('24.16.6. update execution unsuccessfully when proposal is pending', async () => {

        });

        it('24.16.7. update execution unsuccessfully when proposal is voting', async () => {

        });

        it('24.16.8. update execution unsuccessfully when proposal is successfully executed', async () => {

        });

        it('24.16.9. update execution unsuccessfully when proposal is unsuccessfully executed', async () => {

        });

        it('24.16.10. update execution unsuccessfully when proposal is disqualified', async () => {

        });

        it('24.16.11. update execution unsuccessfully when proposal is rejected', async () => {

        });
    });

    describe('24.17. concludeExecution(uint256, string, bool, (uint256, uint256, bytes))', async () => {
        it('24.17.1. conclude execution successfully', async () => {

        });

        it('24.17.2. conclude execution unsuccessfully with invalid proposal id', async () => {

        });

        it('24.17.3. conclude execution unsuccessfully when paused', async () => {

        });

        it('24.17.4. conclude execution unsuccessfully with unauthorized sender', async () => {

        });

        it('24.17.5. conclude execution unsuccessfully with invalid validation', async () => {

        });

        it('24.17.6. conclude execution unsuccessfully with inactive zone', async () => {

        });

        it('24.17.7. conclude execution unsuccessfully when sender is inactive in zone', async () => {

        });

        it('24.17.8. conclude execution unsuccessfully when proposal is pending', async () => {

        });
        
        it('24.17.9. conclude execution unsuccessfully when proposal is voting', async () => {

        });

        it('24.17.10. conclude execution unsuccessfully when proposal is successfully executed', async () => {

        });

        it('24.17.11. conclude execution unsuccessfully when proposal is unsuccessfully executed', async () => {

        });
        
        it('24.17.12. conclude execution unsuccessfully when proposal is disqualified', async () => {

        });

        it('24.17.13. conclude execution unsuccessfully when proposal is rejected', async () => {

        });
    });
});
