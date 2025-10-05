import {
    Contract,
    ethers
} from "ethers";

import { Admin } from "@typechain-types";

import { getSignatures } from "@utils/blockchain";

import { UpdateValidatorParamsInput } from "@utils/models/common/validatable";


// updateValidator
export async function getUpdateValidatorSignatures(
    validatable: Contract,
    paramsInput: UpdateValidatorParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [validatable.address, "updateValidator", paramsInput.validator]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
