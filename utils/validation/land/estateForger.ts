import { ethers } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { time } from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import { EstateForger } from '@typechain-types';

// @utils
import { MockValidator } from '@utils/mockValidator';

// @utils/models/land
import { RequestTokenizationParamsInput, UpdateRequestEstateURIParamsInput } from '@utils/models/land/estateForger';

// requestTokenization
export async function getRequestTokenizationValidation(
    estateForger: EstateForger,
    paramsInput: RequestTokenizationParamsInput,
    validator: MockValidator,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string'],
        [paramsInput.requester, paramsInput.estate.uri]
    );
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    return isValid
        ? validator.getValidation(estateForger, content, expiry)
        : validator.getInvalidValidation(estateForger, content, expiry);
}

// updateRequestEstateURI
export async function getUpdateRequestEstateURIValidation(
    estateForger: EstateForger,
    paramsInput: UpdateRequestEstateURIParamsInput,
    validator: MockValidator,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'string'],
        [paramsInput.requestId, paramsInput.uri]
    );
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);
    return isValid
        ? validator.getValidation(estateForger, content, expiry)
        : validator.getInvalidValidation(estateForger, content, expiry);
}
