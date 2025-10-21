import { ethers } from 'ethers';

// @typechain-types
import { Admin, PriceWatcher } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/common
import { UpdateDefaultRatesParamsInput, UpdatePriceFeedsParamsInput } from '@utils/models/common/priceWatcher';

// @utils/models/common
import { RATES_SCHEMA } from '@utils/models/common/common';

// updatePriceFeeds
export async function getUpdatePriceFeedsSignatures(
    priceWatcher: PriceWatcher,
    paramsInput: UpdatePriceFeedsParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
        [priceWatcher.address, 'updatePriceFeeds', paramsInput.currencies, paramsInput.feeds, paramsInput.heartbeats]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// updateDefaultRates
export async function getUpdateDefaultRatesSignatures(
    priceWatcher: PriceWatcher,
    paramsInput: UpdateDefaultRatesParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', RATES_SCHEMA],
        [priceWatcher.address, 'updateDefaultRates', paramsInput.currencies, paramsInput.rates]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
