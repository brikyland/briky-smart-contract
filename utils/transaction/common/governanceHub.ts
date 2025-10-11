import { ContractTransaction } from "ethers";

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// @typechain-types
import {
    Admin,
    GovernanceHub,
    ProxyCaller
} from "@typechain-types";

// @utils/models/common
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

// @utils/anchor/common
import {
    getSafeContributeBudgetAnchor,
    getSafeVoteAnchor
} from "@utils/anchor/common/governanceHub";

// @utils/mockValidator
import { MockValidator } from "@utils/mockValidator";

// @utils/signatures/common
import { getUpdateFeeSignatures } from "@utils/signatures/common/governanceHub";

// @utils/validation/common
import {
    getAdmitValidation,
    getConcludeExecutionValidation,
    getDisqualifyValidation,
    getLogExecutionValidation,
    getProposeValidation
} from "@utils/validation/common/governanceHub";


// updateFee
export async function getGovernanceHubTx_UpdateFee(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: UpdateFeeParams,
    txConfig = {},
): Promise<ContractTransaction> {
    return await governanceHub.connect(signer).updateFee(
        params.fee,
        params.signatures,
        txConfig
    );
}

export async function getGovernanceHubTxByInput_UpdateFee(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: UpdateFeeParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {},
): Promise<ContractTransaction> {
    const params: UpdateFeeParams = {
        ...paramsInput,
        signatures: await getUpdateFeeSignatures(governanceHub, paramsInput, admin, admins),
    };

    return await getGovernanceHubTx_UpdateFee(governanceHub, signer, params, txConfig);
}


// propose
export async function getGovernanceHubTx_Propose(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: ProposeParams,
    txConfig = {},
): Promise<ContractTransaction> {
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

export async function getGovernanceHubTxByInput_Propose(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: ProposeParamsInput,
    validator: MockValidator,
    txConfig = {},
): Promise<ContractTransaction> {
    const params: ProposeParams = {
        ...paramsInput,
        validation: await getProposeValidation(governanceHub, paramsInput, validator, signer)
    };

    return await getGovernanceHubTx_Propose(governanceHub, signer, params, txConfig);
}

export async function getCallGovernanceHubTx_Propose(
    governanceHub: GovernanceHub,
    caller: ProxyCaller,
    params: ProposeParams,
    txConfig = {},
): Promise<ContractTransaction> {
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

export async function getCallGovernanceHubTxByInput_Propose(
    governanceHub: GovernanceHub,
    caller: ProxyCaller,
    paramsInput: ProposeParamsInput,
    validator: MockValidator,
    txConfig = {},
): Promise<ContractTransaction> {
    const params: ProposeParams = {
        ...paramsInput,
        validation: await getProposeValidation(governanceHub, paramsInput, validator, caller)
    };

    return await getCallGovernanceHubTx_Propose(governanceHub, caller, params, txConfig);
}


// admit
export async function getGovernanceHubTx_Admit(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: AdmitParams,
    txConfig = {},
): Promise<ContractTransaction> {
    return await governanceHub.connect(signer).admit(
        params.proposalId,
        params.contextURI,
        params.reviewURI,
        params.currency,
        params.validation,
        txConfig,
    );
}

export async function getGovernanceHubTxByInput_Admit(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: AdmitParamsInput,
    validator: MockValidator,
    txConfig = {},
): Promise<ContractTransaction> {
    const params: AdmitParams = {
        ...paramsInput,
        validation: await getAdmitValidation(governanceHub, paramsInput, validator)
    };

    return await getGovernanceHubTx_Admit(governanceHub, signer, params, txConfig);
}


// disqualify
export async function getGovernanceTx_Disqualify(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: DisqualifyParams,
    txConfig = {},
): Promise<ContractTransaction> {
    return await governanceHub.connect(signer).disqualify(
        params.proposalId,
        params.contextURI,
        params.reviewURI,
        params.validation,
        txConfig,
    );
}

export async function getGovernanceHubTxByInput_Disqualify(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    paramsInput: DisqualifyParamsInput,
    validator: MockValidator,
    txConfig = {},
): Promise<ContractTransaction> {
    const params: DisqualifyParams = {
        ...paramsInput,
        validation: await getDisqualifyValidation(governanceHub, paramsInput, validator)
    };
    return await getGovernanceTx_Disqualify(governanceHub, signer, params, txConfig);
}


// vote
export async function getGovernanceHubTx_Vote(
    governanceHub: GovernanceHub,
    signer: SignerWithAddress,
    params: VoteParams,
    txConfig = {},
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
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
): Promise<ContractTransaction> {
    const params: ConcludeExecutionParams = {
        ...paramsInput,
        validation: await getConcludeExecutionValidation(governanceHub, paramsInput, validator)
    };

    return await getConcludeExecutionTx(governanceHub, signer, params, txConfig);
}
