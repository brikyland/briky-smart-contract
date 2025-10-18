import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, ProjectToken } from '@typechain-types';

// @utils
import { MockValidator } from '@utils/mockValidator';

// @utils/anchor/launch
import {
    getSafeDeprecateProjectAnchor,
    getSafeTokenizeProjectAnchor,
    getSafeUpdateProjectURIAnchor,
} from '@utils/anchor/launch/projectToken';

// @utils/models/launch
import {
    AuthorizeLaunchpadParams,
    AuthorizeLaunchpadParamsInput,
    DeprecateProjectParams,
    LaunchProjectParams,
    MintParams,
    RegisterInitiatorParams,
    RegisterInitiatorParamsInput,
    SafeDeprecateProjectParams,
    SafeTokenizeProjectParams,
    SafeUpdateProjectURIParams,
    TokenizeProjectParams,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateProjectURIParamsInput,
    UpdateZoneRoyaltyRateParams,
    UpdateZoneRoyaltyRateParamsInput,
    WithdrawEstateTokenParams,
} from '@utils/models/launch/projectToken';

// @utils/signatures/launch
import {
    getAuthorizeLaunchpadSignatures,
    getUpdateBaseURISignatures,
    getUpdateZoneRoyaltyRateSignatures,
} from '@utils/signatures/launch/projectToken';

// @utils/validation/launch
import {
    getRegisterInitiatorValidation,
    getSafeUpdateProjectURIValidation,
} from '@utils/validation/launch/projectToken';

// updateBaseURI
export async function getProjectTokenTx_UpdateBaseURI(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).updateBaseURI(params.uri, params.signatures, txConfig);
}

export async function getProjectTokenTxByInput_UpdateBaseURI(
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
    return getProjectTokenTx_UpdateBaseURI(projectToken, deployer, params, txConfig);
}

// updateZoneRoyaltyRate
export async function getProjectTokenTx_UpdateZoneRoyaltyRate(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: UpdateZoneRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken
        .connect(deployer)
        .updateZoneRoyaltyRate(params.zone, params.royaltyRate, params.signatures, txConfig);
}

export async function getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
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
    return getProjectTokenTx_UpdateZoneRoyaltyRate(projectToken, deployer, params, txConfig);
}

// authorizeLaunchpads
export async function getProjectTokenTx_AuthorizeLaunchpad(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: AuthorizeLaunchpadParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken
        .connect(deployer)
        .authorizeLaunchpads(params.accounts, params.isLaunchpad, params.signatures, txConfig);
}

export async function getProjectTokenTxByInput_AuthorizeLaunchpad(
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
    return getProjectTokenTx_AuthorizeLaunchpad(projectToken, deployer, params, txConfig);
}

// registerInitiator
export async function getProjectTokenTx_RegisterInitiator(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: RegisterInitiatorParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken
        .connect(deployer)
        .registerInitiator(params.zone, params.initiator, params.uri, params.validation, txConfig);
}

export async function getProjectTokenTxByInput_RegisterInitiator(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    paramsInput: RegisterInitiatorParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RegisterInitiatorParams = {
        ...paramsInput,
        validation: await getRegisterInitiatorValidation(projectToken, paramsInput, validator),
    };
    return getProjectTokenTx_RegisterInitiator(projectToken, deployer, params, txConfig);
}

// launchProject
export async function getCallProjectTokenTx_LaunchProject(
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
export async function getProjectTokenTx_Mint(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: MintParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).mint(params.projectId, params.amount, txConfig);
}

export async function getCallProjectTokenTx_Mint(
    projectToken: ProjectToken,
    launchpad: any,
    params: MintParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return launchpad.call(
        projectToken.address,
        projectToken.interface.encodeFunctionData('mint', [params.projectId, params.amount]),
        txConfig
    );
}

// safeWithdrawEstateToken
export async function getProjectTokenTx_WithdrawEstateToken(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: WithdrawEstateTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).withdrawEstateToken(params.projectId, txConfig);
}

// safeDeprecateProject
export async function getProjectTokenTx_SafeDeprecateProject(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: SafeDeprecateProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken.connect(deployer).safeDeprecateProject(params.projectId, params.data, params.anchor, txConfig);
}

export async function getProjectTokenTxByParams_SafeDeprecateProject(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: DeprecateProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeDeprecateProjectParams = {
        ...params,
        anchor: await getSafeDeprecateProjectAnchor(projectToken, params),
    };
    return getProjectTokenTx_SafeDeprecateProject(projectToken, deployer, safeParams, txConfig);
}

// safeUpdateProjectURI
export async function getProjectTokenTx_SafeUpdateProjectURI(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: SafeUpdateProjectURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken
        .connect(deployer)
        .safeUpdateProjectURI(params.projectId, params.uri, params.validation, params.anchor, txConfig);
}

export async function getProjectTokenTxByInput_SafeUpdateProjectURI(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateProjectURIParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: SafeUpdateProjectURIParams = {
        ...paramsInput,
        validation: await getSafeUpdateProjectURIValidation(projectToken, paramsInput, validator),
        anchor: await getSafeUpdateProjectURIAnchor(projectToken, paramsInput),
    };
    return getProjectTokenTx_SafeUpdateProjectURI(projectToken, deployer, params, txConfig);
}

// safeTokenizeProject
export async function getProjectTokenTx_SafeTokenizeProject(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: SafeTokenizeProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return projectToken
        .connect(deployer)
        .safeTokenizeProject(params.projectId, params.custodian, params.broker, params.anchor, txConfig);
}

export async function getProjectTokenTxByParams_SafeTokenizeProject(
    projectToken: ProjectToken,
    deployer: SignerWithAddress,
    params: TokenizeProjectParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeTokenizeProjectParams = {
        ...params,
        anchor: await getSafeTokenizeProjectAnchor(projectToken, params),
    };
    return getProjectTokenTx_SafeTokenizeProject(projectToken, deployer, safeParams, txConfig);
}
