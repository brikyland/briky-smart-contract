import { BigNumber } from 'ethers';

export interface EstateCollateral {
    estateId: BigNumber;
    amount: BigNumber;
}

// borrow
export interface EstateBorrowParams {
    estateId: BigNumber;
    amount: BigNumber;
    principal: BigNumber;
    repayment: BigNumber;
    currency: string;
    duration: number;
}
