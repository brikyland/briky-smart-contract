import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MockValidator } from "@utils/mockValidator";
import { InitiateLaunchParams, UpdateLaunchURIParams, UpdateRoundParams, UpdateRoundsParams } from "@utils/models/launch/prestigePad";
import { Contract } from "ethers";
import { ethers } from 'hardhat';

export async function getInitiateLaunchValidation(
    prestigePad: Contract,
    validator: MockValidator,
    params: InitiateLaunchParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string", "string"],
        [params.projectURI, params.launchURI]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(prestigePad, content, expiry);
    return validation;
}

export async function getInitiateLaunchInvalidValidation(
    prestigePad: Contract,
    validator: MockValidator,
    params: InitiateLaunchParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string", "string"],
        [params.projectURI, params.launchURI]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(prestigePad, content, expiry);
    return validation;
}

export async function getUpdateRoundValidation(
    prestigePad: Contract,
    validator: MockValidator,
    params: UpdateRoundParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.launchId, params.round.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(prestigePad, content, expiry);
    return validation;
}

export async function getUpdateRoundInvalidValidation(
    prestigePad: Contract,
    validator: MockValidator,
    params: UpdateRoundParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.launchId, params.round.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(prestigePad, content, expiry);
    return validation;
}

export async function getUpdateRoundsValidation(
    prestigePad: Contract,
    validator: MockValidator,
    params: UpdateRoundsParams
) {
    const validations = [];
    for (const round of params.addedRounds) {
        const content = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "string"],
            [params.launchId, round.uri]
        );
        const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
        const validation = await validator.getValidation(prestigePad, content, expiry);
        validations.push(validation);
    }

    return validations;
}

export async function getUpdateRoundsInvalidValidation(
    prestigePad: Contract,
    validator: MockValidator,
    params: UpdateRoundsParams
) {
    const validations = [];
    for (const round of params.addedRounds) {
        const content = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "string"],
            [params.launchId, round.uri]
        );
        const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
        const validation = await validator.getInvalidValidation(prestigePad, content, expiry);
        validations.push(validation);
    }
    return validations;
}

export async function getUpdateLaunchURIValidation(
    prestigePad: Contract,
    validator: MockValidator,
    params: UpdateLaunchURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.launchId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(prestigePad, content, expiry);
    return validation;
}

export async function getUpdateLaunchURIInvalidValidation(
    prestigePad: Contract,
    validator: MockValidator,
    params: UpdateLaunchURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.launchId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(prestigePad, content, expiry);
    return validation;
}