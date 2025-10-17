import { BigNumber } from 'ethers';

export interface Validation {
    nonce: BigNumber;
    expiry: BigNumber;
    signature: string;
}

// updateValidator
export interface UpdateValidatorParamsInput {
    validator: string;
}

export interface UpdateValidatorParams extends UpdateValidatorParamsInput {
    signatures: string[];
}
