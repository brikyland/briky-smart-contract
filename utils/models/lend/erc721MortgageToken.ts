import { BigNumber } from 'ethers';

export interface ERC721Collateral {
    token: string;
    tokenId: BigNumber;
}

// registerCollaterals
export interface RegisterCollateralsParamsInput {
    tokens: string[];
    isCollateral: boolean;
}

export interface RegisterCollateralsParams extends RegisterCollateralsParamsInput {
    signatures: string[];
}

// borrow
export interface ERC721BorrowParams {
    token: string;
    tokenId: BigNumber;
    principal: BigNumber;
    repayment: BigNumber;
    currency: string;
    duration: number;
}
