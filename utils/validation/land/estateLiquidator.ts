import { Constant } from '@tests/test.constant';
import { EstateToken, EstateLiquidator, GovernanceHub } from '@typechain-types';
import { MockValidator } from '@utils/mockValidator';
import { RequestExtractionParamsInput } from '@utils/models/land/estateLiquidator';
import { ProposeParamsInput } from '@utils/models/common/governanceHub';
import { ProposalRule } from "@utils/models/common/governanceHub";
import { BigNumber } from 'ethers';
import { getProposeValidation } from '@utils/validation/common/governanceHub';

export async function getRequestExtractionValidation(
    estateLiquidator: EstateLiquidator,
    estateToken: EstateToken,
    governanceHub: GovernanceHub,
    paramsInput: RequestExtractionParamsInput,
    validator: MockValidator,
    timestamp: number,
    isValid = true
) {
    let quorumRate;
    try {
        quorumRate = ((await estateToken.getEstate(paramsInput.estateId)).tokenizeAt + Constant.ESTATE_LIQUIDATOR_UNANIMOUS_GUARD_DURATION > timestamp)
            ? Constant.ESTATE_LIQUIDATOR_UNANIMOUS_QUORUM_RATE
            : Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE;
    } catch (error) {
        quorumRate = BigNumber.from(0);
    }

    const proposeParamsInput: ProposeParamsInput = {
        governor: estateToken.address,
        tokenId: paramsInput.estateId,
        operator: paramsInput.buyer,
        uuid: paramsInput.uuid,
        rule: ProposalRule.ApprovalBeyondQuorum,
        quorumRate: quorumRate,
        duration: Constant.ESTATE_LIQUIDATOR_VOTING_DURATION,
        admissionExpiry: paramsInput.admissionExpiry,
    };

    return await getProposeValidation(governanceHub, proposeParamsInput, validator, estateLiquidator, isValid);
}
