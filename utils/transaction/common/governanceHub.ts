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
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    governanceHub: GovernanceHub,
    paramsInput: UpdateFeeParamsInput,
    txConfig = {},
) {
    const params: UpdateFeeParams = {
        ...paramsInput,
        signatures: await getUpdateFeeSignatures(admins, admin, governanceHub, paramsInput),
    };

    return await getUpdateFeeTx(signer, governanceHub, params, txConfig);
}


// propose
export async function getProposeTx(
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    validator: MockValidator,
    governanceHub: GovernanceHub,
    paramsInput: ProposeParamsInput,
    txConfig = {},
) {
    const params: ProposeParams = {
        ...paramsInput,
        validation: await getProposeValidation(validator, governanceHub, paramsInput, signer)
    };

    return await getProposeTx(signer, governanceHub, params, txConfig);
}

export async function getCallProposeTx(
    caller: ProxyCaller,
    governanceHub: GovernanceHub,
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
    caller: ProxyCaller,
    validator: MockValidator,
    governanceHub: GovernanceHub,
    paramsInput: ProposeParamsInput,
    txConfig = {},
) {
    const params: ProposeParams = {
        ...paramsInput,
        validation: await getProposeValidation(validator, governanceHub, paramsInput, caller)
    };

    return await getCallProposeTx(caller, governanceHub, params, txConfig);
}


// admit
export async function getAdmitTx(
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    validator: MockValidator,
    governanceHub: GovernanceHub,
    paramsInput: AdmitParamsInput,
    txConfig = {},
) {
    const params: AdmitParams = {
        ...paramsInput,
        validation: await getAdmitValidation(validator, governanceHub, paramsInput)
    };

    return await getAdmitTx(signer, governanceHub, params, txConfig);
}


// disqualify
export async function getDisqualifyTx(
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    validator: MockValidator,
    governanceHub: GovernanceHub,
    paramsInput: DisqualifyParamsInput,
    txConfig = {},
) {
    const params: DisqualifyParams = {
        ...paramsInput,
        validation: await getDisqualifyValidation(validator, governanceHub, paramsInput)
    };
    return await getDisqualifyTx(signer, governanceHub, params, txConfig);
}


// vote
export async function getVoteTx(
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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

export async function getSafeVoteTxByInput(
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
    paramsInput: VoteParams,
    txConfig = {},
) {
    const params: SafeVoteParams = {
        ...paramsInput,
        anchor: await getSafeVoteAnchor(governanceHub, paramsInput)
    };
    return await getSafeVoteTx(signer, governanceHub, params, txConfig);
}


// contributeBudget
export async function getContributeBudgetTx(
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
    paramsInput: ContributeBudgetParams,
    txConfig = {},
) {
    const params: SafeContributeBudgetParams = {
        ...paramsInput,
        anchor: await getSafeContributeBudgetAnchor(governanceHub, paramsInput)
    };
    return await getSafeContributeBudgetTx(signer, governanceHub, params, txConfig);
}


// withdrawBudgetContribution
export async function getWithdrawBudgetContributionTx(
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    validator: MockValidator,
    governanceHub: GovernanceHub,
    paramsInput: LogExecutionParamsInput,
    txConfig = {},
) {
    const params: LogExecutionParams = {
        ...paramsInput,
        validation: await getLogExecutionValidation(validator, governanceHub, paramsInput)
    };

    return await getLogExecutionTx(signer, governanceHub, params, txConfig);
}


// concludeExecution
export async function getConcludeExecutionTx(
    signer: SignerWithAddress,
    governanceHub: GovernanceHub,
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
    signer: SignerWithAddress,
    validator: MockValidator,
    governanceHub: GovernanceHub,
    paramsInput: ConcludeExecutionParamsInput,
    txConfig = {},
) {
    const params: ConcludeExecutionParams = {
        ...paramsInput,
        validation: await getConcludeExecutionValidation(validator, governanceHub, paramsInput)
    };

    return await getConcludeExecutionTx(signer, governanceHub, params, txConfig);
}
