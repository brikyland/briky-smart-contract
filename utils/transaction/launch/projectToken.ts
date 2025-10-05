import { Admin, ProjectToken, ProxyCaller } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { AuthorizeLaunchpadParams, AuthorizeLaunchpadParamsInput, DeprecateProjectParams, LaunchProjectParams, MintParams, RegisterInitiatorParams, RegisterInitiatorParamsInput, SafeDeprecateProjectParams, SafeTokenizeProjectParams, SafeUpdateProjectURIParams, TokenizeProjectParams, UpdateBaseURIParams, UpdateBaseURIParamsInput, UpdateProjectURIParams, UpdateProjectURIParamsInput, UpdateZoneRoyaltyRateParams, UpdateZoneRoyaltyRateParamsInput, WithdrawEstateTokenParams } from "@utils/models/launch/projectToken";
import { getRegisterInitiatorValidation, getSafeUpdateProjectURIValidation } from "@utils/validation/launch/projectToken";
import { ContractTransaction, ethers } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getAuthorizeLaunchpadSignatures, getUpdateBaseURISignatures, getUpdateZoneRoyaltyRateSignatures } from "@utils/signatures/launch/projectToken";
import { getSafeDeprecateProjectAnchor, getSafeTokenizeProjectAnchor, getSafeUpdateProjectURIAnchor } from "@utils/anchor/launch/projectToken";


// updateBaseURI
export async function getUpdateBaseURITx(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).updateBaseURI(
        params.uri,
        params.signatures,
        txConfig
    );
}

export async function getUpdateBaseURITxByInput(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(projectToken, paramsInput, admin, admins),
    };
    return getUpdateBaseURITx(projectToken, deployer, params, txConfig);
}


// updateZoneRoyaltyRate
export async function getUpdateZoneRoyaltyRateTx(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: UpdateZoneRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).updateZoneRoyaltyRate(
        params.zone,
        params.royaltyRate,
        params.signatures,
        txConfig
    );
}

export async function getUpdateZoneRoyaltyRateTxByInput(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateZoneRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateZoneRoyaltyRateParams = {
        ...paramsInput,
        signatures: await getUpdateZoneRoyaltyRateSignatures(projectToken, paramsInput, admin, admins),
    };
    return getUpdateZoneRoyaltyRateTx(projectToken, deployer, params, txConfig);
}


// authorizeLaunchpads
export async function getAuthorizeLaunchpadTx(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: AuthorizeLaunchpadParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).authorizeLaunchpads(
        params.accounts,
        params.isLaunchpad,
        params.signatures,
        txConfig
    );
}

export async function getAuthorizeLaunchpadTxByInput(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    paramsInput: AuthorizeLaunchpadParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeLaunchpadParams = {
        ...paramsInput,
        signatures: await getAuthorizeLaunchpadSignatures(projectToken, paramsInput, admin, admins),
    };
    return getAuthorizeLaunchpadTx(projectToken, deployer, params, txConfig);
}


// registerInitiator
export async function getRegisterInitiatorTx(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: RegisterInitiatorParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).registerInitiator(
        params.zone,
        params.initiator,
        params.uri,
        params.validation,
        txConfig
    );
}

export async function getRegisterInitiatorTxByInput(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    paramsInput: RegisterInitiatorParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RegisterInitiatorParams = {
        ...paramsInput,
        validation: await getRegisterInitiatorValidation(projectToken, paramsInput, validator)
    };
    return getRegisterInitiatorTx(projectToken, deployer, params, txConfig);
}


// launchProject
export async function getCallLaunchProjectTx(
    projectToken: ProjectToken,
    launchpad: any,
    params: LaunchProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return launchpad.call(
        projectToken.address,
        projectToken.interface.encodeFunctionData('launchProject', [
            params.zone,
            params.launchId,
            params.initiator,
            params.uri,
        ]),
        txConfig
    );
}


// mint
export async function getCallMintTx(
    projectToken: ProjectToken,
    launchpad: any,
    params: MintParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return launchpad.call(
        projectToken.address,
        projectToken.interface.encodeFunctionData('mint', [
            params.projectId,
            params.amount,
        ]),
        txConfig
    );
}


// safeWithdrawEstateToken
export async function getWithdrawEstateTokenTx(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: WithdrawEstateTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).withdrawEstateToken(
        params.projectId,
        txConfig
    );
}


// safeDeprecateProject
export async function getSafeDeprecateProjectTx(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: SafeDeprecateProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).safeDeprecateProject(
        params.projectId,
        params.data,
        params.anchor,
        txConfig
    );
}

export async function getSafeDeprecateProjectTxByParams(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: DeprecateProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeDeprecateProjectParams = {
        ...params,
        anchor: await getSafeDeprecateProjectAnchor(projectToken, params)
    };
    return getSafeDeprecateProjectTx(projectToken, deployer, safeParams, txConfig);
}


// safeUpdateProjectURI
export async function getSafeUpdateProjectURITx(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: SafeUpdateProjectURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).safeUpdateProjectURI(
        params.projectId,
        params.uri,
        params.validation,
        params.anchor,
        txConfig
    );
}

export async function getSafeUpdateProjectURITxByInput(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateProjectURIParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: SafeUpdateProjectURIParams = {
        ...paramsInput,
        validation: await getSafeUpdateProjectURIValidation(projectToken, paramsInput, validator),
        anchor: await getSafeUpdateProjectURIAnchor(projectToken, paramsInput)
    };
    return getSafeUpdateProjectURITx(projectToken, deployer, params, txConfig);
}


// safeTokenizeProject
export async function getSafeTokenizeProjectTx(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: SafeTokenizeProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).safeTokenizeProject(
        params.projectId,
        params.custodian,
        params.broker,
        params.anchor,
        txConfig
    );
}

export async function getSafeTokenizeProjectTxByParams(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: TokenizeProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeTokenizeProjectParams = {
        ...params,
        anchor: await getSafeTokenizeProjectAnchor(projectToken, params),
    };
    return getSafeTokenizeProjectTx(projectToken, deployer, safeParams, txConfig);
}

export async function getCallSafeTokenizeProjectTx(
    projectToken: ProjectToken,
    caller: ProxyCaller,
    params: SafeTokenizeProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        projectToken.address,
        projectToken.interface.encodeFunctionData('safeTokenizeProject', [
            params.projectId,
            params.custodian,
            params.broker,
            params.anchor,
        ]),
        txConfig
    );
}

export async function getCallSafeTokenizeProjectTxByParams(
    projectToken: ProjectToken,
    caller: ProxyCaller,
    params: TokenizeProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeTokenizeProjectParams = {
        ...params,
        anchor: await getSafeTokenizeProjectAnchor(projectToken, params),
    };
    return getCallSafeTokenizeProjectTx(projectToken, caller, safeParams, txConfig);
}
