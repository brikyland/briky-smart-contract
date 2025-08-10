import { MockProjectToken } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { LaunchProjectParams, MintParams, RegisterInitiatorParams, UpdateProjectURIParams } from "@utils/models/ProjectToken";
import { getRegisterInitiatorValidation, getUpdateProjectURIValidation } from "@utils/validation/ProjectToken";
import { ContractTransaction } from "ethers";

export async function getRegisterInitiatorTx(
    projectToken: MockProjectToken,
    validator: MockValidator,
    deployer: any,
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

export async function getLaunchProjectTx(
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

export async function getMintTx(
    projectToken: MockProjectToken,
    prestigePad: any,
    params: MintParams
): Promise<ContractTransaction> {
    const tx = prestigePad.call(
        projectToken.address,
        projectToken.interface.encodeFunctionData('mint', [
            params.projectId,
            params.amount,
        ])
    );

    return tx;
}

export async function getUpdateProjectURITx(
    projectToken: MockProjectToken,
    validator: MockValidator,
    deployer: any,
    params: UpdateProjectURIParams
): Promise<ContractTransaction> {
    const validation = await getUpdateProjectURIValidation(
        projectToken,
        validator,
        params
    );
    const tx = projectToken.connect(deployer).updateProjectURI(
        params.projectId,
        params.uri,
        validation
    );

    return tx;
}