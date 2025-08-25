import { BigNumber } from "ethers";

export interface RequestExtractionParams {
    estateId: BigNumber;
    buyer: string;
    value: BigNumber;
    currency: string;
    feeRate: BigNumber;
    uuid: string;
}
