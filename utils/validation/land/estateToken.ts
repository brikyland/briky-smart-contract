import { ethers, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { MockValidator } from "@utils/mockValidator";

import {
    RegisterCustodianParamsInput,
    UpdateEstateURIParamsInput,
} from "@utils/models/land/estateToken";


// registerCustodian
export async function getRegisterCustodianValidation(
    estateToken: Contract,
    validator: MockValidator,
    paramsInput: RegisterCustodianParamsInput,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "string"],
        [paramsInput.zone, paramsInput.custodian, paramsInput.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = isValid 
        ? await validator.getValidation(estateToken, content, expiry)
        : await validator.getInvalidValidation(estateToken, content, expiry);
    return validation;
}


// updateEstateURI
export async function getUpdateEstateURIValidation(
    estateToken: Contract,
    validator: MockValidator,
    paramsInput: UpdateEstateURIParamsInput,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [paramsInput.estateId, paramsInput.uri]
    );
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const validation = isValid 
        ? await validator.getValidation(estateToken, content, expiry)
        : await validator.getInvalidValidation(estateToken, content, expiry);
    return validation;
}
