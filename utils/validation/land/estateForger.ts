import {time} from "@nomicfoundation/hardhat-network-helpers";
import {MockValidator} from "@utils/mockValidator";
import {
    RegisterSellerInParams,
    RequestTokenizationParams,
    UpdateRequestEstateURIParams
} from "@utils/models/land/estateForger";
import {ethers} from 'hardhat';
import {EstateForger} from "@typechain-types";

export async function getRegisterSellerInValidation(
    estateForger: EstateForger,
    validator: MockValidator,
    params: RegisterSellerInParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "string"],
        [params.zone, params.account, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return await validator.getValidation(estateForger, content, expiry);
}

export async function getRegisterSellerInInvalidValidation(
    estateForger: EstateForger,
    validator: MockValidator,
    params: RegisterSellerInParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "string"],
        [params.zone, params.account, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return await validator.getInvalidValidation(estateForger, content, expiry);
}

export async function getRequestTokenizationValidation(
    estateForger: EstateForger,
    validator: MockValidator,
    params: RequestTokenizationParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [params.requester, params.estate.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return await validator.getValidation(estateForger, content, expiry);
}

export async function getRequestTokenizationInvalidValidation(
    estateForger: EstateForger,
    validator: MockValidator,
    params: RequestTokenizationParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [params.requester, params.estate.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    return await validator.getInvalidValidation(estateForger, content, expiry);
}

export async function getUpdateRequestEstateURIValidation(
    estateForger: EstateForger,
    validator: MockValidator,
    params: UpdateRequestEstateURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.requestId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
    return await validator.getValidation(estateForger, content, expiry);
}

export async function getUpdateRequestEstateURIInvalidValidation(
    estateForger: EstateForger,
    validator: MockValidator,
    params: UpdateRequestEstateURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.requestId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
    return await validator.getInvalidValidation(estateForger, content, expiry);
}
