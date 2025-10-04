import { ethers, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { MockValidator } from "@utils/mockValidator";

import { RegisterInitiatorParamsInput, UpdateProjectURIParamsInput } from "@utils/models/launch/projectToken";


// registerInitiator
export async function getRegisterInitiatorValidation(
    projectToken: Contract,
    params: RegisterInitiatorParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [params.initiator, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? await validator.getValidation(projectToken, content, expiry)
        : await validator.getInvalidValidation(projectToken, content, expiry);
}


// safeUpdateProjectURI
export async function getSafeUpdateProjectURIValidation(
    projectToken: Contract,
    params: UpdateProjectURIParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.projectId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? await validator.getValidation(projectToken, content, expiry)
        : await validator.getInvalidValidation(projectToken, content, expiry);
}
