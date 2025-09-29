import { MockContract } from "@defi-wonderland/smock";
import { PriceWatcher } from "@typechain-types";
import { callTransaction, getSignatures } from "@utils/blockchain";
import { Rate, RATE_SCHEMA } from "@utils/models/common/common";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";

export async function callPriceWatcher_UpdatePriceFeeds(
    priceWatcher: PriceWatcher | MockContract<PriceWatcher>,
    admins: any[],
    currencyAddresses: string[],
    priceFeeds: string[],
    heartbeats: number[],
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "address[]", "uint40[]"],
        [priceWatcher.address, "updatePriceFeeds", currencyAddresses, priceFeeds, heartbeats]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(priceWatcher.updatePriceFeeds(currencyAddresses, priceFeeds, heartbeats, signatures));
}

export async function callPriceWatcher_UpdateDefaultRates(
    priceWatcher: PriceWatcher | MockContract<PriceWatcher>,
    admins: any[],
    currencyAddresses: string[],
    rates: Rate[],
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", RATE_SCHEMA],
        [priceWatcher.address, "updateDefaultRates", currencyAddresses, rates]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(priceWatcher.updateDefaultRates(currencyAddresses, rates, signatures));
}
