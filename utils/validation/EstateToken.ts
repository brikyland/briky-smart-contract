import { ethers, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { MockValidator } from "@utils/mockValidator";

import { UpdateEstateURIParams } from "@utils/models/EstateToken";

export async function getUpdateEstateURIValidation(
    estateToken: Contract,
    validator: MockValidator,
    params: UpdateEstateURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.estateId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getValidation(estateToken, content, expiry);
    return validation;
}

export async function getUpdateEstateURIInvalidValidation(
    estateToken: Contract,
    validator: MockValidator,
    params: UpdateEstateURIParams
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.estateId, params.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = await validator.getInvalidValidation(estateToken, content, expiry);
    return validation;
}
