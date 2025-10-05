import { Admin, ProxyCaller, ReserveVault } from "@typechain-types";

import {
    getAuthorizeProviderSignatures,
} from "@utils/signatures/common/reserveVault";
import {
    AuthorizeProviderParams,
    AuthorizeProviderParamsInput,
    ExpandFundParams,
    OpenFundParams,
    ProvideFundParams,
    WithdrawFundParams,
} from "@utils/models/common/reserveVault";


// authorizeProviders
export async function getAuthorizeProviderTx(
    reserveVault: ReserveVault,
    deployer: any,
    params: AuthorizeProviderParams,
    txConfig = {},
) {
    return await reserveVault.connect(deployer).authorizeProviders(
        params.accounts,
        params.isProvider,
        params.signatures,
        txConfig
    );
}

export async function getAuthorizeProviderTxByInput(
    reserveVault: ReserveVault,
    deployer: any,
    paramsInput: AuthorizeProviderParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {},
) {
    const params: AuthorizeProviderParams = {
        ...paramsInput,
        signatures: await getAuthorizeProviderSignatures(reserveVault, paramsInput, admin, admins),
    };

    return await getAuthorizeProviderTx(reserveVault, deployer, params, txConfig);
}


// openFund
export async function getOpenFundTx(
    reserveVault: ReserveVault,
    deployer: any,
    params: OpenFundParams,
    txConfig = {},
) {
    return await reserveVault.connect(deployer).openFund(
        params.mainCurrency,
        params.mainDenomination,
        params.extraCurrencies,
        params.extraDenominations,
        txConfig
    );
}

export async function getCallOpenFundTx(
    reserveVault: ReserveVault,
    caller: ProxyCaller,
    params: OpenFundParams,
    txConfig = {},
) {
    return await caller.call(
        reserveVault.address,
        reserveVault.interface.encodeFunctionData('openFund', [
            params.mainCurrency,
            params.mainDenomination,
            params.extraCurrencies,
            params.extraDenominations,
        ]),
        txConfig,
    );
}


// expandFund
export async function getCallExpandFundTx(
    reserveVault: ReserveVault,
    caller: ProxyCaller,
    params: ExpandFundParams,
    txConfig = {},
) {
    return await caller.call(
        reserveVault.address,
        reserveVault.interface.encodeFunctionData('expandFund', [
            params.fundId,
            params.quantity,
        ]),
        txConfig,
    );
}


// provideFund
export async function getCallProvideFundTx(
    reserveVault: ReserveVault,
    caller: ProxyCaller,
    params: ProvideFundParams,
    txConfig = {},
) {
    return await caller.call(
        reserveVault.address,
        reserveVault.interface.encodeFunctionData('provideFund', [
            params.fundId,
        ]),
        txConfig,
    );
}


// withdrawFund
export async function getCallWithdrawFundTx(
    reserveVault: ReserveVault,
    caller: ProxyCaller,
    params: WithdrawFundParams,
    txConfig = {},
) {
    return await caller.call(
        reserveVault.address,
        reserveVault.interface.encodeFunctionData('withdrawFund', [
            params.fundId,
            params.receiver,
            params.quantity,
        ]),
        txConfig,
    );
}
