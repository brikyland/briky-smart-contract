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
    deployer: any,
    reserveVault: ReserveVault,
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
    deployer: any,
    admins: any[],
    admin: Admin,
    reserveVault: ReserveVault,
    paramsInput: AuthorizeProviderParamsInput,
    txConfig = {},
) {
    const params: AuthorizeProviderParams = {
        ...paramsInput,
        signatures: await getAuthorizeProviderSignatures(admins, admin, reserveVault, paramsInput),
    };

    return await getAuthorizeProviderTx(deployer, reserveVault, params, txConfig);
}


// openFund
export async function getOpenFundTx(
    deployer: any,
    reserveVault: ReserveVault,
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
    caller: ProxyCaller,
    reserveVault: ReserveVault,
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
export async function getExpandFundTx(
    deployer: any,
    reserveVault: ReserveVault,
    params: ExpandFundParams,
    txConfig = {},
) {
    return await reserveVault.connect(deployer).expandFund(
        params.fundId,
        params.quantity,
        txConfig
    );
}

export async function getCallExpandFundTx(
    caller: ProxyCaller,
    reserveVault: ReserveVault,
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
export async function getProvideFundTx(
    deployer: any,
    reserveVault: ReserveVault,
    params: ProvideFundParams,
    txConfig = {},
) {
    return await reserveVault.connect(deployer).provideFund(
        params.fundId,
        txConfig
    );
}

export async function getCallProvideFundTx(
    caller: ProxyCaller,
    reserveVault: ReserveVault,
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
export async function getWithdrawFundTx(
    deployer: any,
    reserveVault: ReserveVault,
    params: WithdrawFundParams,
    txConfig = {},
) {
    return await reserveVault.connect(deployer).withdrawFund(
        params.fundId,
        params.receiver,
        params.quantity,
        txConfig
    );
}

export async function getCallWithdrawFundTx(
    caller: ProxyCaller,
    reserveVault: ReserveVault,
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
