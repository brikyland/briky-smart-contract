import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
    Admin,
    GovernanceHub,
    ProxyCaller
} from "@typechain-types";

import {
    AdmitParams,
    AdmitParamsInput,
    ConcludeExecutionParams,
    ConcludeExecutionParamsInput,
    ConfirmParams,
    ContributeBudgetParams,
    DisqualifyParams,
    DisqualifyParamsInput,
    LogExecutionParams,
    LogExecutionParamsInput,
    ProposeParams,
    ProposeParamsInput,
    RejectExecutionParams,
    SafeContributeBudgetParams,
    SafeVoteParams,
    UpdateFeeParams,
    UpdateFeeParamsInput,
    VoteParams,
    WithdrawBudgetContributionParams
} from "@utils/models/common/governanceHub";
import { getUpdateFeeSignatures } from "@utils/signatures/common/governanceHub";
import { getAdmitValidation, getConcludeExecutionValidation, getDisqualifyValidation, getLogExecutionValidation, getProposeValidation } from "@utils/validation/common/governanceHub";
import { MockValidator } from "@utils/mockValidator";
import { getSafeContributeBudgetAnchor, getSafeVoteAnchor } from "@utils/anchor/common/governanceHub";


// updateFee
export async function getUpdateFeeTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: UpdateFeeParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).updateFee(
        params.fee,
        params.signatures,
        txConfig
    );
}

export async function getUpdateFeeTxByInput(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: UpdateFeeParamsInput,
    admins: any[],
    admin: Admin,
    txConfig = {},
) {
    const params: UpdateFeeParams = {
        ...paramsInput,
        signatures: await getUpdateFeeSignatures(governanceHub, paramsInput, admins, admin),
    };

    return await getUpdateFeeTx(governanceHub, signer, params, txConfig);
}


// propose
export async function getProposeTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: ProposeParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).propose(
        params.governor,
        params.tokenId,
        params.operator,
        params.uuid,
        params.rule,
        params.quorumRate,
        params.duration,
        params.admissionExpiry,
        params.validation,
        txConfig,
    );
}

export async function getProposeTxByInput(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: ProposeParamsInput,
    validator: MockValidator,
    txConfig = {},
) {
    const params: ProposeParams = {
        ...paramsInput,
        validation: await getProposeValidation(governanceHub, paramsInput, validator, signer)
    };

    return await getProposeTx(governanceHub, signer, params, txConfig);
}

export async function getCallProposeTx(
    governanceHub: GovernanceHub,
    caller: ProxyCaller,
    params: ProposeParams,
    txConfig = {},
) {
    return await caller.call(
        governanceHub.address,
        governanceHub.interface.encodeFunctionData('propose', [
            params.governor,
            params.tokenId,
            params.operator,
            params.uuid,
            params.rule,
            params.quorumRate,
            params.duration,
            params.admissionExpiry,
            params.validation,
        ]),
        txConfig,
    );
}

export async function getCallProposeTxByInput(
    governanceHub: GovernanceHub,
    caller: ProxyCaller,
    paramsInput: ProposeParamsInput,
    validator: MockValidator,
    txConfig = {},
) {
    const params: ProposeParams = {
        ...paramsInput,
        validation: await getProposeValidation(governanceHub, paramsInput, validator, caller)
    };

    return await getCallProposeTx(governanceHub, caller, params, txConfig);
}


// admit
export async function getAdmitTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: AdmitParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).admit(
        params.proposalId,
        params.contextURI,
        params.reviewURI,
        params.currency,
        params.validation,
        txConfig,
    );
}

export async function getAdmitTxByInput(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: AdmitParamsInput,
    validator: MockValidator,
    txConfig = {},
) {
    const params: AdmitParams = {
        ...paramsInput,
        validation: await getAdmitValidation(governanceHub, paramsInput, validator)
    };

    return await getAdmitTx(governanceHub, signer, params, txConfig);
}


// disqualify
export async function getDisqualifyTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: DisqualifyParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).disqualify(
        params.proposalId,
        params.contextURI,
        params.reviewURI,
        params.validation,
        txConfig,
    );
}

export async function getDisqualifyTxByInput(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: DisqualifyParamsInput,
    validator: MockValidator,
    txConfig = {},
) {
    const params: DisqualifyParams = {
        ...paramsInput,
        validation: await getDisqualifyValidation(governanceHub, paramsInput, validator)
    };
    return await getDisqualifyTx(governanceHub, signer, params, txConfig);
}


// vote
export async function getVoteTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: VoteParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).vote(
        params.proposalId,
        params.voteOption,
        txConfig,
    );
}


// safeVote
export async function getSafeVoteTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: SafeVoteParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).safeVote(
        params.proposalId,
        params.voteOption,
        params.anchor,
        txConfig,
    );
}

export async function getSafeVoteTxByParams(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: VoteParams,
    txConfig = {},
) {
    const params: SafeVoteParams = {
        ...paramsInput,
        anchor: await getSafeVoteAnchor(governanceHub, paramsInput)
    };
    return await getSafeVoteTx(governanceHub, signer, params, txConfig);
}


// contributeBudget
export async function getContributeBudgetTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: ContributeBudgetParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).contributeBudget(
        params.proposalId,
        params.value,
        txConfig,
    );
}


// safeContributeBudget
export async function getSafeContributeBudgetTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: SafeContributeBudgetParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).safeContributeBudget(
        params.proposalId,
        params.value,
        params.anchor,
        txConfig,
    );
}

export async function getSafeContributeBudgetTxByInput(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: ContributeBudgetParams,
    txConfig = {},
) {
    const params: SafeContributeBudgetParams = {
        ...paramsInput,
        anchor: await getSafeContributeBudgetAnchor(governanceHub, paramsInput)
    };
    return await getSafeContributeBudgetTx(governanceHub, signer, params, txConfig);
}


// withdrawBudgetContribution
export async function getWithdrawBudgetContributionTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: WithdrawBudgetContributionParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).withdrawBudgetContribution(
        params.proposalId,
        txConfig,
    );
}


// confirm
export async function getConfirmTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: ConfirmParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).confirm(
        params.proposalId,
        txConfig,
    );
}


// rejectExecution
export async function getRejectExecutionTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: RejectExecutionParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).rejectExecution(
        params.proposalId,
        txConfig,
    );
}


// logExecution
export async function getLogExecutionTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: LogExecutionParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).logExecution(
        params.proposalId,
        params.logURI,
        params.validation,
        txConfig,
    );
}

export async function getLogExecutionTxByInput(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: LogExecutionParamsInput,
    validator: MockValidator,
    txConfig = {},
) {
    const params: LogExecutionParams = {
        ...paramsInput,
        validation: await getLogExecutionValidation(governanceHub, paramsInput, validator)
    };

    return await getLogExecutionTx(governanceHub, signer, params, txConfig);
}


// concludeExecution
export async function getConcludeExecutionTx(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: ConcludeExecutionParams,
    txConfig = {},
) {
    return await governanceHub.connect(signer).concludeExecution(
        params.proposalId,
        params.logURI,
        params.isSuccessful,
        params.validation,
        txConfig,
    );
}

export async function getConcludeExecutionTxByInput(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: ConcludeExecutionParamsInput,
    validator: MockValidator,
    txConfig = {},
) {
    const params: ConcludeExecutionParams = {
        ...paramsInput,
        validation: await getConcludeExecutionValidation(governanceHub, paramsInput, validator)
    };

    return await getConcludeExecutionTx(governanceHub, signer, params, txConfig);
}
