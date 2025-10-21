import { Contract, ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin } from '@typechain-types';

// @utils/models/common
import { UpdateValidatorParams, UpdateValidatorParamsInput } from '@utils/models/common/validatable';

// @utils/signatures/common
import { getUpdateValidatorSignatures } from '@utils/signatures/common/validatable';

// updateValidator
export async function getValidatableTx_UpdateValidator(
    validatable: Contract,
    signer: SignerWithAddress,
    params: UpdateValidatorParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await validatable.connect(signer).updateValidator(params.validator, params.signatures, txConfig);
}

export async function getValidatableTxByInput_UpdateValidator(
    validatable: Contract,
    signer: SignerWithAddress,
    paramsInput: UpdateValidatorParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateValidatorParams = {
        ...paramsInput,
        signatures: await getUpdateValidatorSignatures(validatable, paramsInput, admin, admins),
    };
    return await getValidatableTx_UpdateValidator(validatable, signer, params, txConfig);
}
