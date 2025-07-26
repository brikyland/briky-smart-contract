import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MockValidator } from "@utils/mockValidator";
import { RegisterSellerInParams, RequestTokenizationParams, UpdateRequestURIParams } from '@utils/models/EstateForger';
import { Contract } from "ethers";
import { ethers } from 'hardhat';

export async function getRegisterSellerInValidation(
    estateForger: Contract,
    validator: MockValidator,
    params: RegisterSellerInParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "string"],
        [params.zone, params.account, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(estateForger, content, expiry);
    return validation;
}

export async function getRegisterSellerInInvalidValidation(
    estateForger: Contract,
    validator: MockValidator,
    params: RegisterSellerInParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "string"],
        [params.zone, params.account, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(estateForger, content, expiry);
    return validation;
}

export async function getRequestTokenizationValidation(
    estateForger: Contract,
    validator: MockValidator,
    params: RequestTokenizationParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        [params.estate.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(estateForger, content, expiry);
    return validation;
}

export async function getRequestTokenizationInvalidValidation(
    estateForger: Contract,
    validator: MockValidator,
    params: RequestTokenizationParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        [params.estate.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(estateForger, content, expiry);
    return validation;
}

export async function getUpdateRequestURIValidation(
    estateForger: Contract,
    validator: MockValidator,
    params: UpdateRequestURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        [params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
    const validation = await validator.getValidation(estateForger, content, expiry);
    return validation;
}

export async function getUpdateRequestURIInvalidValidation(
    estateForger: Contract,
    validator: MockValidator,
    params: UpdateRequestURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        [params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);
    const validation = await validator.getInvalidValidation(estateForger, content, expiry);
    return validation;
}
