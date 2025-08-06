import { ethers, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { MockValidator } from "@utils/mockValidator";

import { RegisterInitiatorParams, UpdateProjectURIParams } from "@utils/models/ProjectToken";

export async function getRegisterInitiatorValidation(
    projectToken: Contract,
    validator: MockValidator,
    params: RegisterInitiatorParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        [params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(projectToken, content, expiry);
    return validation;
}

export async function getRegisterInitiatorInvalidValidation(
    projectToken: Contract,
    validator: MockValidator,
    params: RegisterInitiatorParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        [params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(projectToken, content, expiry);
    return validation;
}

export async function getUpdateProjectURIValidation(
    projectToken: Contract,
    validator: MockValidator,
    params: UpdateProjectURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.projectId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(projectToken, content, expiry);
    return validation;
}

export async function getUpdateProjectURIInvalidValidation(
    projectToken: Contract,
    validator: MockValidator,
    params: UpdateProjectURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.projectId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(projectToken, content, expiry);
    return validation;
}
