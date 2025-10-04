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
    params: InitiateLaunchParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string", "string"],
        [params.projectURI, params.launchURI]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? await validator.getValidation(prestigePad, content, expiry)
        : await validator.getInvalidValidation(prestigePad, content, expiry);
}


// updateRound
export async function getUpdateRoundValidation(
    prestigePad: Contract,
    params: UpdateRoundParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.launchId, params.round.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? await validator.getValidation(prestigePad, content, expiry)
        : await validator.getInvalidValidation(prestigePad, content, expiry);
}


// updateRounds
export async function getUpdateRoundsValidation(
    prestigePad: Contract,
    params: UpdateRoundsParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const validations = [];
    for (const round of params.addedRounds) {
        const content = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "string"],
            [params.launchId, round.uri]
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
    params: UpdateLaunchURIParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.launchId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? await validator.getValidation(prestigePad, content, expiry)
        : await validator.getInvalidValidation(prestigePad, content, expiry);
}
