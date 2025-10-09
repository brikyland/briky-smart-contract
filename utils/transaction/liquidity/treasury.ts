import { ProvideLiquidityParams, WithdrawLiquidityParams, WithdrawOperationFundParams, WithdrawOperationFundParamsInput } from "@utils/models/liquidity/treasury";
import { Admin, Treasury } from "@typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getWithdrawOperationFundSignatures } from "@utils/signatures/liquidity/treasury";


// withdrawOperationFund
export async function getTreasuryTx_WithdrawOperationFund(
    treasury: Treasury,
    deployer: SignerWithAddress,
    params: WithdrawOperationFundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return treasury.connect(deployer).withdrawOperationFund(
        params.operator,
        params.value,
        params.signatures,
        txConfig
    );
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
    return treasury.connect(deployer).withdrawLiquidity(
        params.withdrawer,
        params.value,
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
    return treasury.connect(deployer).provideLiquidity(
        params.value,
        txConfig
    );
}