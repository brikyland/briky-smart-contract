import { Admin, PriceWatcher } from "@typechain-types";
import { callTransaction } from "@utils/blockchain";

import { Rate } from "@utils/models/common/common";
import { getUpdateCurrencyRegistriesTxByInput } from "@utils/transaction/common/admin";
import { getUpdateDefaultRatesTxByInput, getUpdatePriceFeedsTxByInput } from "@utils/transaction/common/priceWatcher";

export async function addCurrencyToAdminAndPriceWatcher(
    deployer: any,
    admin: Admin,
    priceWatcher: PriceWatcher,
    admins: any[],
    currencyAddresses: string[],
    isAvailable: boolean[],
    isExclusive: boolean[],
    priceFeeds: string[],
    heartbeats: number[],
    defaultRates: Rate[],
) {
    await callTransaction(getUpdateCurrencyRegistriesTxByInput(admin, deployer, {
        currencies: currencyAddresses,
        isAvailable,
        isExclusive,
    }, admins));
    
    await callTransaction(getUpdatePriceFeedsTxByInput(priceWatcher, deployer, {
        currencies: currencyAddresses,
        feeds: priceFeeds,
        heartbeats,
    }, admins, admin));
    
    await callTransaction(getUpdateDefaultRatesTxByInput(priceWatcher, deployer, {
        currencies: currencyAddresses,
        rates: defaultRates,
    }, admins, admin));
}