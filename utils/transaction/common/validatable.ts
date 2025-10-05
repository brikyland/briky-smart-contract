import { Contract } from "ethers";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Admin } from "@typechain-types";

import { UpdateValidatorParams, UpdateValidatorParamsInput } from "@utils/models/common/validatable";

import { getUpdateValidatorSignatures } from "@utils/signatures/common/validatable";


// updateValidator
export async function getUpdateValidatorTx(
    validatable: Contract,
    signer: SignerWithAddress,
    params: UpdateValidatorParams,
    txConfig = {}
) {
    return await validatable.connect(signer).updateValidator(
        params.validator,
        params.signatures,
        txConfig
    );
}

export async function getUpdateValidatorTxByInput(
    validatable: Contract,
    signer: SignerWithAddress,
    paramsInput: UpdateValidatorParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
) {
    const params: UpdateValidatorParams = {
        ...paramsInput,
        signatures: await getUpdateValidatorSignatures(validatable, paramsInput, admin, admins)
    };
    return await getUpdateValidatorTx(validatable, signer, params, txConfig);
}
