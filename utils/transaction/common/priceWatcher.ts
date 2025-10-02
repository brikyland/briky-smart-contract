import { Admin, PriceWatcher } from "@typechain-types";

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
    deployer: any,
    priceWatcher: PriceWatcher,
    params: UpdatePriceFeedsParams,
    txConfig = {},
) {
    return await priceWatcher.connect(deployer).updatePriceFeeds(
        params.currencies,
        params.feeds,
        params.heartbeats,
        params.signatures,
        txConfig
    );
}

export async function getUpdatePriceFeedsTxByInput(
    deployer: any,
    admins: any[],
    admin: Admin,
    priceWatcher: PriceWatcher,
    paramsInput: UpdatePriceFeedsParamsInput,
    txConfig = {},
) {
    const params: UpdatePriceFeedsParams = {
        ...paramsInput,
        signatures: await getUpdatePriceFeedsSignatures(admins, admin, priceWatcher, paramsInput)
    };
    return await getUpdatePriceFeedsTx(deployer, priceWatcher, params, txConfig);
}


// updateDefaultRates
export async function getUpdateDefaultRatesTx(
    deployer: any,
    priceWatcher: PriceWatcher,
    params: UpdateDefaultRatesParams,
    txConfig = {},
) {
    return await priceWatcher.connect(deployer).updateDefaultRates(
        params.currencies,
        params.rates,
        params.signatures,
        txConfig
    );
}

export async function getUpdateDefaultRatesTxByInput(
    deployer: any,
    admins: any[],
    admin: Admin,
    priceWatcher: PriceWatcher,
    paramsInput: UpdateDefaultRatesParamsInput,
    txConfig = {},
) {
    const params: UpdateDefaultRatesParams = {
        ...paramsInput,
        signatures: await getUpdateDefaultRatesSignatures(admins, admin, priceWatcher, paramsInput)
    };
    return await getUpdateDefaultRatesTx(deployer, priceWatcher, params, txConfig);
}