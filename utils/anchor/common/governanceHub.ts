// @typechain-types
import { GovernanceHub } from '@typechain-types';

// @utils/models/common
import { ContributeBudgetParams, VoteParams } from '@utils/models/common/governanceHub';

// safeVote
export async function getSafeVoteAnchor(governanceHub: GovernanceHub, params: VoteParams): Promise<string> {
    return (await governanceHub.getProposal(params.proposalId)).uuid;
}

// safeContributeBudget
export async function getSafeContributeBudgetAnchor(
    governanceHub: GovernanceHub,
    params: ContributeBudgetParams
): Promise<string> {
    return (await governanceHub.getProposal(params.proposalId)).uuid;
}
