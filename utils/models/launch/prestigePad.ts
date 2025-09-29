import { BigNumber, ethers } from "ethers";
import { Validation } from "../common/validatable";
import { MockPrestigePad } from "@typechain-types";
import { PrestigePad } from "@typechain-types";

export interface PrestigePadRoundInput {
    uri: string;
    quota: PrestigePadRoundQuotaInput;
    quote: PrestigePadRoundQuoteInput;
};

export interface PrestigePadRound {
    uri: string;
    quota: PrestigePadRoundQuotaInput;
    quote: PrestigePadRoundQuoteInput;
    agenda: PrestigePadRoundAgendaInput;
};

export interface PrestigePadRoundQuotaInput {
    totalQuantity: BigNumber;
    minRaisingQuantity: BigNumber;
    maxRaisingQuantity: BigNumber;
};

export interface PrestigePadRoundQuota {
    totalQuantity: BigNumber;
    minRaisingQuantity: BigNumber;
    maxRaisingQuantity: BigNumber;
    soldQuantity: BigNumber;
};

export interface PrestigePadRoundQuoteInput {
    unitPrice: BigNumber;
    currency: string;
};

export interface PrestigePadRoundQuote {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackFundId: BigNumber;
    feeDenomination: BigNumber;
};

export interface PrestigePadRoundAgendaInput {
    raiseStartsAt: number;
    raiseEndsAt: number;
};

export interface PrestigePadRoundAgenda {
    saleStartsAt: number;
    privateSaleEndsAt: number;
    publicSaleEndsAt: number;
};

export interface InitiateLaunchParams {
    initiator: string;
    zone: string;
    projectURI: string;
    launchURI: string;
    feeRate: BigNumber;
    initialQuantity: BigNumber;
}

export interface UpdateRoundParams {
    launchId: BigNumber;
    index: BigNumber;
    round: PrestigePadRoundInput;
}

export interface UpdateRoundsParams {
    launchId: BigNumber;
    removedRoundNumber: BigNumber;
    addedRounds: PrestigePadRoundInput[];
}

export interface ScheduleNextRoundParams {
    launchId: BigNumber;
    cashbackThreshold: BigNumber;
    cashbackBaseRate: BigNumber;
    cashbackCurrencies: string[];
    cashbackDenominations: BigNumber[];
    raiseStartsAt: number;
    raiseDuration: number;
}

export interface UpdateLaunchURIParams {
    launchId: BigNumber;
    uri: string;
}

export interface ConfirmCurrentRoundParams {
    launchId: BigNumber;
}

export interface SafeConfirmCurrentRoundParams {
    launchId: BigNumber;
    anchor: string;
}

export interface FinalizeLaunchParams {
    launchId: BigNumber;
}

export interface SafeFinalizeLaunchParams {
    launchId: BigNumber;
    anchor: string;
}

export async function getSafeConfirmCurrentRoundParams(
    prestigePad: PrestigePad | MockPrestigePad,
    params: ConfirmCurrentRoundParams
): Promise<SafeConfirmCurrentRoundParams> {
    const currentURI = (await prestigePad.getLaunch(params.launchId)).uri;
    const safeParams: SafeConfirmCurrentRoundParams = {
        ...params,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return safeParams;
}

export async function getSafeFinalizeLaunchParams(
    prestigePad: PrestigePad | MockPrestigePad,
    params: FinalizeLaunchParams
): Promise<SafeFinalizeLaunchParams> {
    const currentURI = (await prestigePad.getLaunch(params.launchId)).uri;
    const safeParams: SafeFinalizeLaunchParams = {
        ...params,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return safeParams;
}
