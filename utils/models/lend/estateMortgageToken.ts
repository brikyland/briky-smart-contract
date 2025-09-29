import { BigNumber } from "ethers";

export interface EstateCollateral {
    estateId: BigNumber;
    amount: BigNumber;
}

export interface EstateBorrowParams {
    estateId: BigNumber;
    amount: BigNumber;
    principal: BigNumber;
    repayment: BigNumber;
    currency: string;
    duration: BigNumber;
}
