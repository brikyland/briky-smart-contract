import { GovernanceHub, ProxyCaller } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { AdmitParams, ConcludeExecutionParams, DisqualifyParams, LogExecutionParams, ProposeParams } from "@utils/models/common/governanceHub";
import { getAdmitValidation, getConcludeExecutionValidation, getDisqualifyValidation, getLogExecutionValidation, getProposeValidation } from "@utils/validation/common/governanceHub";

export async function getProposeTx(
    governanceHub: GovernanceHub,
    validator: MockValidator,
    signer: any,
    params: ProposeParams,
    txConfig = {},
) {
    const validation = await getProposeValidation(governanceHub, validator, signer, params);
    return await governanceHub.connect(signer).propose(
        params.governor,
        params.tokenId,
        params.operator,
        params.uuid,
        params.rule,
        params.quorumRate,
        params.duration,
        params.admissionExpiry,
        validation,
        txConfig,
    );
}

export async function getCallProposeTx(
    governanceHub: GovernanceHub,
    validator: MockValidator,
    caller: ProxyCaller,
    params: ProposeParams,
    txConfig = {},
) {
    const validation = await getProposeValidation(governanceHub, validator, caller, params);
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
            validation,
        ]),
        txConfig,
    );
}

export async function getAdmitTx(
    governanceHub: GovernanceHub,
    validator: MockValidator,
    signer: any,
    params: AdmitParams,
    txConfig = {},
) {
    const validation = await getAdmitValidation(governanceHub, validator, params);
    return await governanceHub.connect(signer).admit(
        params.proposalId,
        params.contextURI,
        params.reviewURI,
        params.currency,
        validation,
        txConfig,
    );
}

export async function getDisqualifyTx(
    governanceHub: GovernanceHub,
    validator: MockValidator,
    signer: any,
    params: DisqualifyParams,
    txConfig = {},
) {
    const validation = await getDisqualifyValidation(governanceHub, validator, params);
    return await governanceHub.connect(signer).disqualify(
        params.proposalId,
        params.contextURI,
        params.reviewURI,
        validation,
        txConfig,
    );
}

export async function getLogExecutionTx(
    governanceHub: GovernanceHub,
    validator: MockValidator,
    signer: any,
    params: LogExecutionParams,
    txConfig = {},
) {
    const validation = await getLogExecutionValidation(governanceHub, validator, params);
    return await governanceHub.connect(signer).logExecution(
        params.proposalId,
        params.logURI,
        validation,
        txConfig,
    );
}

export async function getConcludeExecutionTx(
    governanceHub: GovernanceHub,
    validator: MockValidator,
    signer: any,
    params: ConcludeExecutionParams,
    txConfig = {},
) {
    const validation = await getConcludeExecutionValidation(governanceHub, validator, params);
    return await governanceHub.connect(signer).concludeExecution(
        params.proposalId,
        params.logURI,
        params.isSuccessful,
        validation,
        txConfig,
    );
}
