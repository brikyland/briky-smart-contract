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
    validator: MockValidator,
    params: RequestTokenizationParamsInput,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [params.requester, params.estate.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return isValid
        ? validator.getValidation(estateForger, content, expiry)
        : validator.getInvalidValidation(estateForger, content, expiry);
}


// updateRequestEstateURI
export async function getUpdateRequestEstateURIValidation(
    estateForger: EstateForger,
    validator: MockValidator,
    params: UpdateRequestEstateURIParamsInput,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.requestId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
    return isValid
        ? validator.getValidation(estateForger, content, expiry)
        : validator.getInvalidValidation(estateForger, content, expiry);
}
