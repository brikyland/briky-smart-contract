import { ethers, Contract } from 'ethers';

// @nomicfoundation/hardhat-network-helpers
import { time } from '@nomicfoundation/hardhat-network-helpers';

// @utils
import { MockValidator } from '@utils/mockValidator';

// @utils/models/launch
import { RegisterInitiatorParamsInput, UpdateProjectURIParamsInput } from '@utils/models/launch/projectToken';

// registerInitiator
export async function getRegisterInitiatorValidation(
    projectToken: Contract,
    paramsInput: RegisterInitiatorParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string'],
        [paramsInput.initiator, paramsInput.uri]
    );
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    return isValid
        ? await validator.getValidation(projectToken, content, expiry)
        : await validator.getInvalidValidation(projectToken, content, expiry);
}

// safeUpdateProjectURI
export async function getSafeUpdateProjectURIValidation(
    projectToken: Contract,
    paramsInput: UpdateProjectURIParamsInput,
    validator: MockValidator,
    isValid = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'string'],
        [paramsInput.projectId, paramsInput.uri]
    );
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    return isValid
        ? await validator.getValidation(projectToken, content, expiry)
        : await validator.getInvalidValidation(projectToken, content, expiry);
}
