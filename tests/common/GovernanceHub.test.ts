import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Admin,
    GovernanceHub,
    Governor,
    Governor__factory,
} from '@typechain-types';
import { callTransaction, getSignatures, getValidationMessage, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployMockValidatable } from '@utils/deployments/mock/mockValidatable';
import { Validation } from '@utils/models/Validation';
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';
import { ProposalRule, ProposalState } from '@utils/models/Proposal';
import { BigNumber, Wallet } from 'ethers';
import { MockContract, smock } from '@defi-wonderland/smock';

interface GovernanceHubFixture {
    admin: Admin;
    governanceHub: GovernanceHub;
    governor: MockContract<Governor>;

    deployer: any;
    admins: any[];
    validator: any;
    proposer1: any;
    proposer2: any;
    operator1: any;
    operator2: any;

    validatorNonce: BigNumber;
}

describe('24. GovernanceHub', async () => {
    async function governanceHubFixture(): Promise<GovernanceHubFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const validator = accounts[Constant.ADMIN_NUMBER + 1];
        const proposer1 = accounts[Constant.ADMIN_NUMBER + 2];
        const proposer2 = accounts[Constant.ADMIN_NUMBER + 3];
        const operator1 = accounts[Constant.ADMIN_NUMBER + 4];
        const operator2 = accounts[Constant.ADMIN_NUMBER + 5];

        let validatorNonce = ethers.BigNumber.from(0);
  
        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const SmockGovernor = await smock.mock<Governor__factory>('Governor');
        const governor = await SmockGovernor.deploy();
        await governor.initialize(admin.address);

        const governanceHub = await deployGovernanceHub(
            deployer,
            admin.address,
            validator.address,
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
            validatorNonce,
        };
    };

    async function beforeGovernanceHubTest(): Promise<GovernanceHubFixture> {
        const fixture = await loadFixture(governanceHubFixture);
        return fixture;
    }

    describe('24.1. initialize(address, address, uint256)', async () => {
        it('24.1.1. init validator successfully after deploy', async () => {
            const { admin, governanceHub, validator } = await beforeGovernanceHubTest();

            expect(await governanceHub.admin()).to.equal(admin.address);
            expect(await governanceHub.validator()).to.equal(validator.address);
            expect(await governanceHub.fee()).to.equal(Constant.GOVERNANCE_HUB_FEE);
        });
    });

    describe('24.2. updateFee(uint256)', async () => {
        it.only('24.2.1. updateFee successfully with valid signatures', async () => {
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

        it.only('24.2.2. updateFee unsuccessfully with invalid signatures', async () => {
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
            
        });

        it('24.3.2. revert with invalid proposal id', async () => {

        });
    });

    describe('24.4. getProposalVerdict(uint256)', async () => {
        it('24.4.1. return unsettled verdict for pending proposal', async () => {
            
        });

        it('24.4.2. return passed verdict for executing proposal', async () => {
            
        });

        it('24.4.3. return passed verdict for successfully executed proposal', async () => {
            
        });

        it('24.4.4. return passed verdict for unsuccessfully executed proposal', async () => {
            
        });

        it('24.4.5. return failed verdict for disqualified proposal', async () => {

        });

        it('24.4.6. return failed verdict for rejected proposal', async () => {

        });

        it('24.4.7. return failed verdict for expired proposal', async () => {

        });

        it('24.4.8. return passed verdict with enough approval votes for approval beyond quorum rule', async () => {

        });

        it('24.4.9. return failed verdict with not enough approval votes after due for approval beyond quorum rule', async () => {

        });

        it('24.4.10. return unsettled verdict with not enough approval votes before due for approval beyond quorum rule', async () => {

        });

        it('24.4.11. return failed verdict with enough disapproval votes for disapproval beyond quorum rule', async () => {

        });

        it('24.4.12. return failed verdict with not enough disapproval votes after due for disapproval beyond quorum rule', async () => {

        });

        it('24.4.13. return unsettled verdict with not enough disapproval votes before due for disapproval beyond quorum rule', async () => {

        });

        it('24.4.14. revert with invalid proposal id', async () => {
            
        });
    });

    describe('24.5. getProposalState(uint256)', async () => {
        it('24.5.1. return disqualified state with confirmation overdue proposal', async () => {
            
        });

        it('24.5.2. return correct proposal state', async () => {
            
        });

        it('24.5.3. revert with invalid proposal id', async () => {
            
        });
    });

    describe('24.6. propose(address, uint256, address, bytes32, uint8, uint256, uint40, uint40, (uint256, uint256, bytes))', async () => {
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

        async function getProposeValidation(
            fixture: GovernanceHubFixture,
            signer: Wallet,
            params: ProposeParams,
            nonce: BigNumber,
        ): Promise<{ newNonce: BigNumber, validation: Validation }> {
            const { governanceHub, validator } = fixture;

            const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

            const content = ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "address", "address", "bytes32", "uint8", "uint256", "uint40", "uint40"],
                [params.governor, params.tokenId, signer.address, params.operator, params.uuid, params.rule, params.quorumRate, params.duration, params.admissionExpiry]
            );

            const message = getValidationMessage(
                governanceHub,
                content,
                nonce,
                expiry,
            );

            const validation: Validation = {
                nonce: nonce,
                expiry: expiry,
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            return {
                newNonce: nonce.add(1),
                validation,
            };
        }

        async function beforeProposeTest(fixture: GovernanceHubFixture): Promise<ProposeParams> {
            const { governor, operator1 } = fixture;
            return {
                governor: governor.address,
                tokenId: 1,
                operator: operator1.address,
                uuid: "uuid_1",
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: 2000,                
            };
        }

        it.only('24.6.1. propose successfully with valid validation', async () => {
            const fixture = await beforeGovernanceHubTest();
            const { governanceHub, governor, operator1, operator2, proposer1, proposer2 } = fixture;
            let currentValidatorNonce = fixture.validatorNonce;
            
            const fee = await governanceHub.fee();

            // Tx1: Send just enough fee
            let proposer1InitBalance = await ethers.provider.getBalance(proposer1.address);
            let governanceHubInitBalance = await ethers.provider.getBalance(governanceHub.address);

            const params1 = {
                governor: governor.address,
                tokenId: 1,
                operator: operator1.address,
                uuid: "uuid_1",
                rule: ProposalRule.ApprovalBeyondQuorum,
                quorumRate: ethers.utils.parseEther("0.7"),
                duration: 1000,
                admissionExpiry: 2000,
            }
            
            const validationData1 = await getProposeValidation(fixture, proposer1, params1, currentValidatorNonce);
            currentValidatorNonce = validationData1.newNonce;
            const validation1 = validationData1.validation;

            const tx1 = await governanceHub.connect(proposer1).propose(
                params1.governor,
                params1.tokenId,
                params1.operator,
                params1.uuid,
                params1.rule,
                params1.quorumRate,
                params1.duration,
                params1.admissionExpiry,
                validation1.signature,
                { value: fee },
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(governanceHub, 'ProposalCreated').withArgs(
                params1.governor,
                params1.tokenId,
                proposer1.address,
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
            
        });

        it('24.6.2. propose unsuccessfully with invalid validation', async () => {

        });

        it('24.6.3. propose unsuccessfully when not paused', async () => {

        });
        
        it('24.6.4. propose unsuccessfully with invalid governor', async () => {

        });

        it('24.6.5. propose unsuccessfully with unavailable token id', async () => {

        });

        it('24.6.6. propose unsuccessfully with invalid quorum rate', async () => {

        });
        
        it('24.6.7. propose unsuccessfully with invalid timestamp', async () => {

        });
    });

    describe('24.7. admit(uint256, string, string, address, (uint256, uint256, bytes))', async () => {
        it('24.7.1. admit successfully with valid validation', async () => {

        });

        it('24.7.2. admit unsuccessfully with invalid validation', async () => {
            
        });

        it('24.7.3. admit unsuccessfully with invalid proposal id', async () => {

        });

        it('24.7.4. admit unsuccessfully by unauthorized sender', async () => {

        });

        it('24.7.5. admit unsuccessfully when paused', async () => {

        });

        it('24.7.6. admit unsuccessfully with voting proposal', async () => {

        });

        it('24.7.6. admit unsuccessfully with executing proposal', async () => {

        });

        it('24.7.7. admit unsuccessfully with successfully executed proposal', async () => {

        });

        it('24.7.8. admit unsuccessfully with unsuccessfully executed proposal', async () => {

        });

        it('24.7.9. admit unsuccessfully with disqualified proposal', async () => {

        });

        it('24.7.10. admit unsuccessfully with rejected proposal', async () => {

        });

        it('24.7.11. admit unsuccessfully with admission expired proposal', async () => {

        });

        it('24.7.12. admit unsuccessfully with no longer available token id', async () => {

        });

        it('24.7.13. admit unsuccessfully when zone is not active', async () => {

        });

        it('24.7.14. admit unsuccessfully when sender is not active in zone', async () => {

        });
        
        it('24.7.15. admin unsuccessfully when token have zero total vote power', async () => {

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
