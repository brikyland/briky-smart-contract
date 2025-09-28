import { Admin, PriceWatcher } from "../../typechain-types";
import { callAdmin_UpdateCurrencyRegistries } from "./admin";
import { 
    callPriceWatcher_UpdateDefaultRates,
    callPriceWatcher_UpdatePriceFeeds
} from "./priceWatcher";
import { Rate } from "@utils/models/Common";

export async function addCurrencyToAdminAndPriceWatcher(
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
    await callAdmin_UpdateCurrencyRegistries(
        admin,
        admins,
        currencyAddresses,
        isAvailable,
        isExclusive,
        await admin.nonce()
    );
    await callPriceWatcher_UpdatePriceFeeds(
        priceWatcher,
        admins,
        currencyAddresses,
        priceFeeds,
        heartbeats,
        await admin.nonce()
    );
    await callPriceWatcher_UpdateDefaultRates(
        priceWatcher,
        admins,
        currencyAddresses,
        defaultRates,
        await admin.nonce()
    );
}