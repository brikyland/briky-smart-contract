import { Constant } from '@tests/test.constant';
import { EstateToken, EstateLiquidator, GovernanceHub } from '@typechain-types';
import { MockValidator } from '@utils/mockValidator';
import { RequestExtractionParams } from '@utils/models/EstateLiquidator';
import { ProposeParams } from '@utils/models/GovernanceHub';
import { ProposalRule } from '@utils/models/Proposal';
import { BigNumber, Contract, Wallet } from 'ethers';
import { getProposeInvalidValidation, getProposeValidation } from './GovernanceHub';

export async function getRequestExtractionValidation(
    estateToken: EstateToken,
    estateLiquidator: EstateLiquidator,
    governanceHub: GovernanceHub,
    validator: MockValidator,
    timestamp: number,
    operator: Wallet | Contract,
    params: RequestExtractionParams
) {
    let quorumRate;
    try {
        quorumRate = ((await estateToken.getEstate(params.estateId)).tokenizeAt + Constant.ESTATE_LIQUIDATOR_UNANIMOUS_GUARD_DURATION > timestamp)
            ? Constant.ESTATE_LIQUIDATOR_UNANIMOUS_QUORUM_RATE
            : Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE;
    } catch (error) {
        quorumRate = BigNumber.from(0);
    }

    const proposeParams: ProposeParams = {
        governor: estateToken.address,
        tokenId: params.estateId,
        operator: operator.address,
        uuid: params.uuid,
        rule: ProposalRule.ApprovalBeyondQuorum,
        quorumRate: quorumRate,
        duration: Constant.ESTATE_LIQUIDATOR_VOTING_DURATION,
        admissionExpiry: timestamp + Constant.ESTATE_LIQUIDATOR_ADMISSION_DURATION,
    };

    return await getProposeValidation(governanceHub, validator, estateLiquidator, proposeParams);
}

export async function getRequestExtractionInvalidValidation(
    estateToken: EstateToken,
    estateLiquidator: EstateLiquidator,
    governanceHub: GovernanceHub,
    validator: MockValidator,
    timestamp: number,
    operator: Wallet | Contract,
    params: RequestExtractionParams
) {
    const quorumRate = ((await estateToken.getEstate(params.estateId)).tokenizeAt + Constant.ESTATE_LIQUIDATOR_UNANIMOUS_GUARD_DURATION > timestamp)
        ? Constant.ESTATE_LIQUIDATOR_UNANIMOUS_QUORUM_RATE
        : Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE;

    const proposeParams: ProposeParams = {
        governor: estateToken.address,
        tokenId: params.estateId,
        operator: operator.address,
        uuid: params.uuid,
        rule: ProposalRule.ApprovalBeyondQuorum,
        quorumRate: quorumRate,
        duration: Constant.ESTATE_LIQUIDATOR_VOTING_DURATION,
        admissionExpiry: timestamp + Constant.ESTATE_LIQUIDATOR_ADMISSION_DURATION,
    };

    return await getProposeInvalidValidation(governanceHub, validator, estateLiquidator, proposeParams);
}
