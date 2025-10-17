import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, ProxyCaller, Treasury } from '@typechain-types';

// @utils/models/liquidity
import {
    ProvideLiquidityParams,
    WithdrawLiquidityParams,
    WithdrawOperationFundParams,
    WithdrawOperationFundParamsInput,
} from '@utils/models/liquidity/treasury';

// @utils/signatures/liquidity
import { getWithdrawOperationFundSignatures } from '@utils/signatures/liquidity/treasury';

// withdrawOperationFund
export async function getTreasuryTx_WithdrawOperationFund(
    treasury: Treasury,
    deployer: SignerWithAddress,
    params: WithdrawOperationFundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return treasury.connect(deployer).withdrawOperationFund(params.operator, params.value, params.signatures, txConfig);
}

export async function getTreasuryTxByInput_WithdrawOperationFund(
    treasury: Treasury,
    deployer: SignerWithAddress,
    paramsInput: WithdrawOperationFundParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: WithdrawOperationFundParams = {
        ...paramsInput,
        signatures: await getWithdrawOperationFundSignatures(treasury, paramsInput, admin, admins),
    };
    return getTreasuryTx_WithdrawOperationFund(treasury, deployer, params, txConfig);
}

// withdrawLiquidity
export async function getTreasuryTx_WithdrawLiquidity(
    treasury: Treasury,
    deployer: SignerWithAddress,
    params: WithdrawLiquidityParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return treasury.connect(deployer).withdrawLiquidity(params.withdrawer, params.value, txConfig);
}

export async function getCallTreasuryTx_WithdrawLiquidity(
    treasury: Treasury,
    caller: ProxyCaller,
    params: WithdrawLiquidityParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        treasury.address,
        treasury.interface.encodeFunctionData('withdrawLiquidity', [params.withdrawer, params.value]),
        txConfig
    );
}

// provideLiquidity
export async function getTreasuryTx_ProvideLiquidity(
    treasury: Treasury,
    deployer: SignerWithAddress,
    params: ProvideLiquidityParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return treasury.connect(deployer).provideLiquidity(params.value, txConfig);
}
