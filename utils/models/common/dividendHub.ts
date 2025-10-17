import { BigNumber } from 'ethers';

// issueDividend
export interface IssueDividendParams {
    governor: string;
    tokenId: BigNumber;
    value: BigNumber;
    currency: string;
    note: string;
}

// withdraw
export interface WithdrawParams {
    dividendIds: BigNumber[];
}
