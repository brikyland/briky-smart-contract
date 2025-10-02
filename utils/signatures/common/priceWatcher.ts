import { ethers } from "ethers";

import {
    Admin,
    PriceWatcher
} from "@typechain-types";

import { getSignatures } from "@utils/blockchain";

import { UpdateDefaultRatesParamsInput, UpdatePriceFeedsParamsInput } from "@utils/models/common/priceWatcher";

import { RATES_SCHEMA } from "@utils/models/common/common";


// updatePriceFeeds
export async function getUpdatePriceFeedsSignatures(
    admins: any[],
    admin: Admin,
    priceWatcher: PriceWatcher,
    paramsInput: UpdatePriceFeedsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "address[]", "uint40[]"],
        [priceWatcher.address, "updatePriceFeeds", paramsInput.currencies, paramsInput.feeds, paramsInput.heartbeats]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// updateDefaultRates
export async function getUpdateDefaultRatesSignatures(
    admins: any[],
    admin: Admin,
    priceWatcher: PriceWatcher,
    paramsInput: UpdateDefaultRatesParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", RATES_SCHEMA],
        [priceWatcher.address, "updateDefaultRates", paramsInput.currencies, paramsInput.rates]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}