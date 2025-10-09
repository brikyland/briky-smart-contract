import { Admin, PriceWatcher } from "@typechain-types";
import { callTransaction } from "@utils/blockchain";

import { Rate } from "@utils/models/common/common";
import { getAdminTxByInput_UpdateCurrencyRegistries } from "@utils/transaction/common/admin";
import { getPriceWatcherTxByInput_UpdateDefaultRates, getPriceWatcherTxByInput_UpdatePriceFeeds } from "@utils/transaction/common/priceWatcher";

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
    await callTransaction(getAdminTxByInput_UpdateCurrencyRegistries(
        admin,
        deployer,
        {
            currencies: currencyAddresses,
            isAvailable,
            isExclusive,
        },
        admins
    ));
    
    await callTransaction(getPriceWatcherTxByInput_UpdatePriceFeeds(priceWatcher, deployer, {
        currencies: currencyAddresses,
        feeds: priceFeeds,
        heartbeats,
    }, admin, admins));
    
    await callTransaction(getPriceWatcherTxByInput_UpdateDefaultRates(priceWatcher, deployer, {
        currencies: currencyAddresses,
        rates: defaultRates,
    }, admin, admins));
}