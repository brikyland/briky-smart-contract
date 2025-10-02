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
    await callTransaction(getUpdateCurrencyRegistriesTxByInput(
        deployer,
        admins,
        admin,
        {
            currencies: currencyAddresses,
            isAvailable,
            isExclusive,
        }
    ));
    
    await callTransaction(getUpdatePriceFeedsTxByInput(
        deployer,
        admins,
        admin,
        priceWatcher,
        {
            currencies: currencyAddresses,
            feeds: priceFeeds,
            heartbeats,
        }
    ));
    
    await callTransaction(getUpdateDefaultRatesTxByInput(
        deployer,
        admins,
        admin,
        priceWatcher,
        {
            currencies: currencyAddresses,
            rates: defaultRates,
        }
    ));
}