import { BigNumber } from 'ethers';

// @utils/models/common
import { Validation } from '@utils/models/common/validatable';

// requestExtraction
export interface RequestExtractionParamsInput {
    estateId: BigNumber;
    buyer: string;
    value: BigNumber;
    currency: string;
    feeRate: BigNumber;
    uuid: string;
    admissionExpiry: number;
}

export interface RequestExtractionParams extends RequestExtractionParamsInput {
    validation: Validation;
}

// conclude
export interface ConcludeParams {
    requestId: BigNumber;
}
