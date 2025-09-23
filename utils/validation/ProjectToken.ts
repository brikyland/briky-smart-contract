import { ethers, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { MockValidator } from "@utils/mockValidator";

import { RegisterInitiatorParams, SafeUpdateProjectURIParams, UpdateProjectURIParams } from "@utils/models/ProjectToken";

export async function getRegisterInitiatorValidation(
    projectToken: Contract,
    validator: MockValidator,
    params: RegisterInitiatorParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [params.initiator, params.uri]
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
        ["address", "string"],
        [params.initiator, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(projectToken, content, expiry);
    return validation;
}

export async function getSafeUpdateProjectURIValidation(
    projectToken: Contract,
    validator: MockValidator,
    params: SafeUpdateProjectURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.projectId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(projectToken, content, expiry);
    return validation;
}

export async function getSafeUpdateProjectURIInvalidValidation(
    projectToken: Contract,
    validator: MockValidator,
    params: SafeUpdateProjectURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.projectId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(projectToken, content, expiry);
    return validation;
}
