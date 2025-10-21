import { BigNumber } from 'ethers';

// @utils/models/common
import { Validation } from '@utils/models/common/validatable';

// updateBaseUnitPriceRange
export interface UpdateBaseUnitPriceRangeParamsInput {
    baseMinUnitPrice: BigNumber;
    baseMaxUnitPrice: BigNumber;
}

export interface UpdateBaseUnitPriceRangeParams extends UpdateBaseUnitPriceRangeParamsInput {
    signatures: string[];
}

// initiateLaunch
export interface InitiateLaunchParamsInput {
    initiator: string;
    zone: string;
    projectURI: string;
    launchURI: string;
    feeRate: BigNumber;
    initialQuantity: BigNumber;
}

export interface InitiateLaunchParams extends InitiateLaunchParamsInput {
    validation: Validation;
}

// updateLaunchURI
export interface UpdateLaunchURIParamsInput {
    launchId: BigNumber;
    uri: string;
}

export interface UpdateLaunchURIParams extends UpdateLaunchURIParamsInput {
    validation: Validation;
}

// updateRound
export interface PrestigePadRoundInput {
    uri: string;
    quota: PrestigePadRoundQuotaInput;
    quote: PrestigePadRoundQuoteInput;
}

export interface PrestigePadRound {
    uri: string;
    quota: PrestigePadRoundQuotaInput;
    quote: PrestigePadRoundQuoteInput;
    agenda: PrestigePadRoundAgendaInput;
}

export interface PrestigePadRoundQuotaInput {
    totalQuantity: BigNumber;
    minRaisingQuantity: BigNumber;
    maxRaisingQuantity: BigNumber;
}

export interface PrestigePadRoundQuota {
    totalQuantity: BigNumber;
    minRaisingQuantity: BigNumber;
    maxRaisingQuantity: BigNumber;
    soldQuantity: BigNumber;
}

export interface PrestigePadRoundQuoteInput {
    unitPrice: BigNumber;
    currency: string;
}

export interface PrestigePadRoundQuote {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackFundId: BigNumber;
    feeDenomination: BigNumber;
}

export interface PrestigePadRoundAgendaInput {
    raiseStartsAt: number;
    raiseEndsAt: number;
}

export interface PrestigePadRoundAgenda {
    saleStartsAt: number;
    privateSaleEndsAt: number;
    publicSaleEndsAt: number;
}

export interface UpdateRoundParamsInput {
    launchId: BigNumber;
    index: BigNumber;
    round: PrestigePadRoundInput;
}

export interface PrestigePadRoundInputWithValidation extends PrestigePadRoundInput {
    validation: Validation;
}

export interface UpdateRoundParams {
    launchId: BigNumber;
    index: BigNumber;
    round: PrestigePadRoundInputWithValidation;
}

// updateRounds
export interface UpdateRoundsParamsInput {
    launchId: BigNumber;
    removedRoundNumber: BigNumber;
    addedRounds: PrestigePadRoundInput[];
}

export interface UpdateRoundsParams {
    launchId: BigNumber;
    removedRoundNumber: BigNumber;
    addedRounds: PrestigePadRoundInputWithValidation[];
}

// scheduleNextRound
export interface ScheduleNextRoundParams {
    launchId: BigNumber;
    cashbackThreshold: BigNumber;
    cashbackBaseRate: BigNumber;
    cashbackCurrencies: string[];
    cashbackDenominations: BigNumber[];
    raiseStartsAt: number;
    raiseDuration: number;
}

// cancelCurrentRound
export interface CancelCurrentRoundParams {
    launchId: BigNumber;
}

// confirmCurrentRound
export interface ConfirmCurrentRoundParams {
    launchId: BigNumber;
}

// safeConfirmCurrentRound
export interface SafeConfirmCurrentRoundParams extends ConfirmCurrentRoundParams {
    anchor: string;
}

// safeFinalize
export interface FinalizeParams {
    launchId: BigNumber;
}

export interface SafeFinalizeParams extends FinalizeParams {
    anchor: string;
}

// contributeCurrentRound
export interface ContributeCurrentRoundParams {
    launchId: BigNumber;
    quantity: BigNumber;
}

// safeContributeCurrentRound
export interface SafeContributeCurrentRoundParams extends ContributeCurrentRoundParams {
    anchor: string;
}

// withdrawContribution
export interface WithdrawContributionParams {
    roundId: BigNumber;
}

// withdrawProjectToken
export interface WithdrawProjectTokenParams {
    launchId: BigNumber;
    index: BigNumber;
}
