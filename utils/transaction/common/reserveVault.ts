import { ContractTransaction } from 'ethers';

// @typechain-types
import { Admin, ProxyCaller, ReserveVault } from '@typechain-types';

// @utils/signatures/common
import { getAuthorizeProviderSignatures } from '@utils/signatures/common/reserveVault';

// @utils/models/common
import {
    AuthorizeProviderParams,
    AuthorizeProviderParamsInput,
    ExpandFundParams,
    OpenFundParams,
    ProvideFundParams,
    WithdrawFundParams,
} from '@utils/models/common/reserveVault';

// authorizeProviders
export async function getReserveVaultTx_AuthorizeProvider(
    reserveVault: ReserveVault,
    deployer: any,
    params: AuthorizeProviderParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await reserveVault
        .connect(deployer)
        .authorizeProviders(params.accounts, params.isProvider, params.signatures, txConfig);
}

export async function getReserveVaultTxByInput_AuthorizeProvider(
    reserveVault: ReserveVault,
    deployer: any,
    paramsInput: AuthorizeProviderParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeProviderParams = {
        ...paramsInput,
        signatures: await getAuthorizeProviderSignatures(reserveVault, paramsInput, admin, admins),
    };

    return await getReserveVaultTx_AuthorizeProvider(reserveVault, deployer, params, txConfig);
}

// openFund
export async function getReserveVaultTx_OpenFund(
    reserveVault: ReserveVault,
    deployer: any,
    params: OpenFundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await reserveVault
        .connect(deployer)
        .openFund(
            params.mainCurrency,
            params.mainDenomination,
            params.extraCurrencies,
            params.extraDenominations,
            txConfig
        );
}

export async function getCallReserveVaultTx_OpenFund(
    reserveVault: ReserveVault,
    caller: ProxyCaller,
    params: OpenFundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await caller.call(
        reserveVault.address,
        reserveVault.interface.encodeFunctionData('openFund', [
            params.mainCurrency,
            params.mainDenomination,
            params.extraCurrencies,
            params.extraDenominations,
        ]),
        txConfig
    );
}

// expandFund
export async function getCallReserveVaultTx_ExpandFund(
    reserveVault: ReserveVault,
    caller: ProxyCaller,
    params: ExpandFundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await caller.call(
        reserveVault.address,
        reserveVault.interface.encodeFunctionData('expandFund', [params.fundId, params.quantity]),
        txConfig
    );
}

// provideFund
export async function getCallReserveVaultTx_ProvideFund(
    reserveVault: ReserveVault,
    caller: ProxyCaller,
    params: ProvideFundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await caller.call(
        reserveVault.address,
        reserveVault.interface.encodeFunctionData('provideFund', [params.fundId]),
        txConfig
    );
}

// withdrawFund
export async function getCallReserveVaultTx_WithdrawFund(
    reserveVault: ReserveVault,
    caller: ProxyCaller,
    params: WithdrawFundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await caller.call(
        reserveVault.address,
        reserveVault.interface.encodeFunctionData('withdrawFund', [params.fundId, params.receiver, params.quantity]),
        txConfig
    );
}
