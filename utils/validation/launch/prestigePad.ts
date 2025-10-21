import { Contract } from 'ethers';
import { ethers } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { time } from '@nomicfoundation/hardhat-network-helpers';

// @utils
import { MockValidator } from '@utils/mockValidator';

// @utils/models/launch
import {
    InitiateLaunchParamsInput,
    UpdateLaunchURIParamsInput,
    UpdateRoundParamsInput,
    UpdateRoundsParamsInput,
} from '@utils/models/launch/prestigePad';

// initiateLaunch
export async function getInitiateLaunchValidation(
    prestigePad: Contract,
    paramsInput: InitiateLaunchParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ['string', 'string'],
        [paramsInput.projectURI, paramsInput.launchURI]
    );
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

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
        ['uint256', 'string'],
        [paramsInput.launchId, paramsInput.round.uri]
    );
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

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
        const content = ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], [paramsInput.launchId, round.uri]);
        const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);
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
    const content = ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], [paramsInput.launchId, paramsInput.uri]);
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    return isValid
        ? await validator.getValidation(prestigePad, content, expiry)
        : await validator.getInvalidValidation(prestigePad, content, expiry);
}
