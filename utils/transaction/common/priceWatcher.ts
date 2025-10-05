import { Admin, PriceWatcher } from "@typechain-types";
import { ContractTransaction } from "ethers";

import {
    getUpdateDefaultRatesSignatures,
    getUpdatePriceFeedsSignatures
} from "@utils/signatures/common/priceWatcher";
import {
    UpdateDefaultRatesParams,
    UpdateDefaultRatesParamsInput,
    UpdatePriceFeedsParams,
    UpdatePriceFeedsParamsInput
} from "@utils/models/common/priceWatcher";


// updatePriceFeeds
export async function getUpdatePriceFeedsTx(
    priceWatcher: PriceWatcher,
    deployer: any,
    params: UpdatePriceFeedsParams,
    txConfig = {},
): Promise<ContractTransaction> {
    return await priceWatcher.connect(deployer).updatePriceFeeds(
        params.currencies,
        params.feeds,
        params.heartbeats,
        params.signatures,
        txConfig
    );
}

export async function getUpdatePriceFeedsTxByInput(
    priceWatcher: PriceWatcher,
    deployer: any,
    paramsInput: UpdatePriceFeedsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {},
): Promise<ContractTransaction> {
    const params: UpdatePriceFeedsParams = {
        ...paramsInput,
        signatures: await getUpdatePriceFeedsSignatures(priceWatcher, paramsInput, admin, admins)
    };
    return await getUpdatePriceFeedsTx(priceWatcher, deployer, params, txConfig);
}


// updateDefaultRates
export async function getUpdateDefaultRatesTx(
    priceWatcher: PriceWatcher,
    deployer: any,
    params: UpdateDefaultRatesParams,
    txConfig = {},
): Promise<ContractTransaction> {
    return await priceWatcher.connect(deployer).updateDefaultRates(
        params.currencies,
        params.rates,
        params.signatures,
        txConfig
    );
}

export async function getUpdateDefaultRatesTxByInput(
    priceWatcher: PriceWatcher,
    deployer: any,
    paramsInput: UpdateDefaultRatesParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {},
): Promise<ContractTransaction> {
    const params: UpdateDefaultRatesParams = {
        ...paramsInput,
        signatures: await getUpdateDefaultRatesSignatures(priceWatcher, paramsInput, admin, admins)
    };
    return await getUpdateDefaultRatesTx(priceWatcher, deployer, params, txConfig);
}