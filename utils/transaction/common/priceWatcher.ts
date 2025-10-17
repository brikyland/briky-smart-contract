import { ContractTransaction } from 'ethers';

// @typechain-types
import { Admin, PriceWatcher } from '@typechain-types';

// @utils/signatures/common
import { getUpdateDefaultRatesSignatures, getUpdatePriceFeedsSignatures } from '@utils/signatures/common/priceWatcher';

// @utils/models/common
import {
    UpdateDefaultRatesParams,
    UpdateDefaultRatesParamsInput,
    UpdatePriceFeedsParams,
    UpdatePriceFeedsParamsInput,
} from '@utils/models/common/priceWatcher';

// updatePriceFeeds
export async function getPriceWatcherTx_UpdatePriceFeeds(
    priceWatcher: PriceWatcher,
    deployer: any,
    params: UpdatePriceFeedsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await priceWatcher
        .connect(deployer)
        .updatePriceFeeds(params.currencies, params.feeds, params.heartbeats, params.signatures, txConfig);
}

export async function getPriceWatcherTxByInput_UpdatePriceFeeds(
    priceWatcher: PriceWatcher,
    deployer: any,
    paramsInput: UpdatePriceFeedsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdatePriceFeedsParams = {
        ...paramsInput,
        signatures: await getUpdatePriceFeedsSignatures(priceWatcher, paramsInput, admin, admins),
    };
    return await getPriceWatcherTx_UpdatePriceFeeds(priceWatcher, deployer, params, txConfig);
}

// updateDefaultRates
export async function getPriceWatcherTx_UpdateDefaultRates(
    priceWatcher: PriceWatcher,
    deployer: any,
    params: UpdateDefaultRatesParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await priceWatcher
        .connect(deployer)
        .updateDefaultRates(params.currencies, params.rates, params.signatures, txConfig);
}

export async function getPriceWatcherTxByInput_UpdateDefaultRates(
    priceWatcher: PriceWatcher,
    deployer: any,
    paramsInput: UpdateDefaultRatesParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateDefaultRatesParams = {
        ...paramsInput,
        signatures: await getUpdateDefaultRatesSignatures(priceWatcher, paramsInput, admin, admins),
    };
    return await getPriceWatcherTx_UpdateDefaultRates(priceWatcher, deployer, params, txConfig);
}
