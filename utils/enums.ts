export enum LoanState {
    Nil,
    Pending,
    Supplied,
    Repaid,
    Foreclosed,
    Cancelled
}

export enum EstateMarketplaceOfferState {
    Nil,
    Selling,
    Sold,
    Cancelled
}

export enum CommissionMarketplaceOfferState {
    Nil,
    Selling,
    Sold,
    Cancelled
}

export enum MortgageMarketplaceOfferState {
    Nil,
    Selling,
    Sold,
    Cancelled
}

export enum StakeTokenOperation {
    Stake,
    Unstake,
    FetchReward,
    Promote,
    Transfer
}
