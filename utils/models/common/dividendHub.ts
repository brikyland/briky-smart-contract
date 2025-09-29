import { BigNumber } from "ethers";

export interface IssueDividendParams {
    governor: string;
    tokenId: BigNumber;
    value: BigNumber;
    currency: string;
    data: string;
}
