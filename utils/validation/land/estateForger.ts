import {time} from "@nomicfoundation/hardhat-network-helpers";
import {MockValidator} from "@utils/mockValidator";
import {
    RequestTokenizationParamsInput,
    UpdateRequestEstateURIParamsInput
} from "@utils/models/land/estateForger";
import {ethers} from 'hardhat';
import {EstateForger} from "@typechain-types";


// requestTokenization
export async function getRequestTokenizationValidation(
    estateForger: EstateForger,
    paramsInput: RequestTokenizationParamsInput,
    validator: MockValidator,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [paramsInput.requester, paramsInput.estate.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

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
        ["uint256", "string"],
        [paramsInput.requestId, paramsInput.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
    return isValid
        ? validator.getValidation(estateForger, content, expiry)
        : validator.getInvalidValidation(estateForger, content, expiry);
}
