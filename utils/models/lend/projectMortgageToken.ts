import { BigNumber } from 'ethers';

export interface ProjectCollateral {
    projectId: BigNumber;
    amount: BigNumber;
}

export interface ProjectBorrowParams {
    projectId: BigNumber;
    amount: BigNumber;
    principal: BigNumber;
    repayment: BigNumber;
    currency: string;
    duration: number;
}
