import { BigNumber } from "ethers";

export interface RequestExtractionParams {
    estateId: BigNumber;
    value: BigNumber;
    currency: string;
    uuid: string;
}
