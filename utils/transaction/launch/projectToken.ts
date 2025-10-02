import { MockProjectToken, ProxyCaller } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { DeprecateProjectParams, LaunchProjectParams, MintParams, RegisterInitiatorParams, SafeDeprecateProjectParams, SafeTokenizeProjectParams, SafeUpdateProjectURIParams, TokenizeProjectParams, UpdateProjectURIParams } from "@utils/models/launch/projectToken";
import { getRegisterInitiatorValidation, getSafeUpdateProjectURIValidation } from "@utils/validation/launch/projectToken";
import { ContractTransaction, ethers } from "ethers";

export async function getRegisterInitiatorTx(
    projectToken: MockProjectToken,
    validator: MockValidator,
    deployer: SignerWithAddress,
    params: RegisterInitiatorParams
): Promise<ContractTransaction> {
    const validation = await getRegisterInitiatorValidation(
        projectToken,
        validator,
        params
    );

    const tx = projectToken.connect(deployer).registerInitiator(
        params.zone,
        params.initiator,
        params.uri,
        validation
    );

    return tx;            
}

export async function getCallLaunchProjectTx(
    projectToken: MockProjectToken,
    launchpad: any,
    params: LaunchProjectParams
): Promise<ContractTransaction> {
    const tx = launchpad.call(
        projectToken.address,
        projectToken.interface.encodeFunctionData('launchProject', [
            params.zone,
            params.launchId,
            params.initiator,
            params.uri,
        ])
    );

    return tx;
}

export async function getCallMintTx(
    projectToken: MockProjectToken,
    launchpad: any,
    params: MintParams
): Promise<ContractTransaction> {
    const tx = launchpad.call(
        projectToken.address,
        projectToken.interface.encodeFunctionData('mint', [
            params.projectId,
            params.amount,
        ])
    );

    return tx;
}

export async function getSafeUpdateProjectURITx(
    projectToken: MockProjectToken,
    validator: MockValidator,
    deployer: SignerWithAddress,
    params: SafeUpdateProjectURIParams
): Promise<ContractTransaction> {
    const validation = await getSafeUpdateProjectURIValidation(
        projectToken,
        validator,
        params
    );
    const tx = projectToken.connect(deployer).safeUpdateProjectURI(
        params.projectId,
        params.uri,
        validation,
        params.anchor
    );

    return tx;
}

export async function getSafeUpdateProjectURITxByParams(
    projectToken: MockProjectToken,
    validator: MockValidator,
    deployer: SignerWithAddress,
    params: UpdateProjectURIParams
): Promise<ContractTransaction> {
    const currentURI = await projectToken.uri(params.projectId);
    const safeParams: SafeUpdateProjectURIParams = {
        ...params,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    const validation = await getSafeUpdateProjectURIValidation(
        projectToken,
        validator,
        safeParams
    );
    const tx = projectToken.connect(deployer).safeUpdateProjectURI(
        safeParams.projectId,
        safeParams.uri,
        validation,
        safeParams.anchor
    );

    return tx;
}

export async function getSafeDeprecateProjectTx(
    projectToken: MockProjectToken,
    deployer: SignerWithAddress,
    params: SafeDeprecateProjectParams
): Promise<ContractTransaction> {
    const tx = projectToken.connect(deployer).safeDeprecateProject(
        params.projectId,
        params.data,
        params.anchor
    );
    return tx;
}

export async function getSafeDeprecateProjectTxByParams(
    projectToken: MockProjectToken,
    deployer: SignerWithAddress,
    params: DeprecateProjectParams
): Promise<ContractTransaction> {
    const currentURI = await projectToken.uri(params.projectId);
    const safeParams: SafeDeprecateProjectParams = {
        ...params,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getSafeDeprecateProjectTx(projectToken, deployer, safeParams);
}

export async function getSafeTokenizeProjectTx(
    projectToken: MockProjectToken,
    deployer: SignerWithAddress,
    params: SafeTokenizeProjectParams
): Promise<ContractTransaction> {
    const tx = projectToken.connect(deployer).safeTokenizeProject(
        params.projectId,
        params.custodian,
        params.broker,
        params.anchor
    );
    return tx;
}

export async function getSafeTokenizeProjectTxByParams(
    projectToken: MockProjectToken,
    deployer: SignerWithAddress,
    params: TokenizeProjectParams
): Promise<ContractTransaction> {
    const currentURI = await projectToken.uri(params.projectId);
    const safeParams: SafeTokenizeProjectParams = {
        ...params,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getSafeTokenizeProjectTx(projectToken, deployer, safeParams);
}

export async function getCallSafeTokenizeProjectTx(
    projectToken: MockProjectToken,
    caller: ProxyCaller,
    params: SafeTokenizeProjectParams
): Promise<ContractTransaction> {
    const tx = caller.call(
        projectToken.address,
        projectToken.interface.encodeFunctionData('safeTokenizeProject', [
            params.projectId,
            params.custodian,
            params.broker,
            params.anchor,
        ])
    );
    return tx;
}

export async function getCallSafeTokenizeProjectTxByParams(
    projectToken: MockProjectToken,
    caller: ProxyCaller,
    params: TokenizeProjectParams
): Promise<ContractTransaction> {
    const currentURI = await projectToken.uri(params.projectId);
    const safeParams: SafeTokenizeProjectParams = {
        ...params,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getCallSafeTokenizeProjectTx(projectToken, caller, safeParams);
}
