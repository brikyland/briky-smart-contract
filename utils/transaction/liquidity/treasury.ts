import { ProvideLiquidityParams, WithdrawLiquidityParams, WithdrawOperationFundParams, WithdrawOperationFundParamsInput } from "@utils/models/liquidity/treasury";
import { Admin, Treasury } from "@typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getWithdrawOperationFundSignatures } from "@utils/signatures/liquidity/treasury";


// withdrawOperationFund
export async function getWithdrawOperationFundTx(
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

export async function getWithdrawOperationFundTxByInput(
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
    return getWithdrawOperationFundTx(treasury, deployer, params, txConfig);
}


// withdrawLiquidity
export async function getWithdrawLiquidityTx(
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
export async function getProvideLiquidityTx(
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