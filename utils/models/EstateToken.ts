import { BigNumber } from "ethers";

import { Validation } from "./Validation";

export interface UpdateEstateURIParams {
    estateId: BigNumber;
    uri: string;
}
