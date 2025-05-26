import { Admin, EstateForger, EstateToken } from "../../typechain-types";
import { BigNumberish } from "ethers";
import { callAdmin_UpdateCurrencyRegistries } from "./admin";
import { 
    callEstateForger_UpdateDefaultRates,
    callEstateForger_UpdatePriceFeeds
} from "./estateForger";

export async function addCurrency(
    admin: Admin,
    estateForger: EstateForger,
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
    await callEstateForger_UpdatePriceFeeds(
        estateForger,
        admins,
        currencyAddresses,
        priceFeeds,
        heartbeats,
        await admin.nonce()
    );
    await callEstateForger_UpdateDefaultRates(
        estateForger,
        admins,
        currencyAddresses,
        defaultValues,
        defaultDecimals,
        await admin.nonce()
    );
}