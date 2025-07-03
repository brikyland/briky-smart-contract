import { Admin, EstateForger, EstateToken, PriceWatcher } from "../../typechain-types";
import { BigNumberish } from "ethers";
import { callAdmin_UpdateCurrencyRegistries } from "./admin";
import { 
    callPriceWatcher_UpdateDefaultRates,
    callPriceWatcher_UpdatePriceFeeds
} from "./priceWatcher";

export async function addCurrencyToAdminAndPriceWatcher(
    admin: Admin,
    priceWatcher: PriceWatcher,
    admins: any[],
    currencyAddresses: string[],
    isAvailable: boolean[],
    isExclusive: boolean[],
    priceFeeds: string[],
    heartbeats: number[],
    defaultValues: number[],
    defaultDecimals: number[],
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
        defaultValues,
        defaultDecimals,
        await admin.nonce()
    );
}