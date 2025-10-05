import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MockValidator } from "@utils/mockValidator";
import { InitiateLaunchParamsInput, UpdateLaunchURIParamsInput, UpdateRoundParams, UpdateRoundsParams } from "@utils/models/launch/prestigePad";
import { UpdateRoundParamsInput } from "@utils/models/launch/prestigePad";
import { UpdateRoundsParamsInput } from "@utils/models/launch/prestigePad";
import { Contract } from "ethers";
import { ethers } from 'hardhat';


// initiateLaunch
export async function getInitiateLaunchValidation(
    prestigePad: Contract,
    paramsInput: InitiateLaunchParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string", "string"],
        [paramsInput.projectURI, paramsInput.launchURI]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? await validator.getValidation(prestigePad, content, expiry)
        : await validator.getInvalidValidation(prestigePad, content, expiry);
}


// updateRound
export async function getUpdateRoundValidation(
    prestigePad: Contract,
    paramsInput: UpdateRoundParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [paramsInput.launchId, paramsInput.round.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? await validator.getValidation(prestigePad, content, expiry)
        : await validator.getInvalidValidation(prestigePad, content, expiry);
}


// updateRounds
export async function getUpdateRoundsValidation(
    prestigePad: Contract,
    paramsInput: UpdateRoundsParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const validations = [];
    for (const round of paramsInput.addedRounds) {
        const content = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "string"],
            [paramsInput.launchId, round.uri]
        );
        const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
        const validation = isValid
            ? await validator.getValidation(prestigePad, content, expiry)
            : await validator.getInvalidValidation(prestigePad, content, expiry);
        validations.push(validation);
    }

    return validations;
}


// updateLaunchURI
export async function getUpdateLaunchURIValidation(
    prestigePad: Contract,
    paramsInput: UpdateLaunchURIParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [paramsInput.launchId, paramsInput.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? await validator.getValidation(prestigePad, content, expiry)
        : await validator.getInvalidValidation(prestigePad, content, expiry);
}
