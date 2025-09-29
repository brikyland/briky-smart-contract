import { WithdrawOperationFundParams } from "@utils/models/liquidity/treasury";
import { Treasury } from "@typechain-types";

export function getWithdrawOperationFundTx(
    treasury: Treasury,
    deployer: any,
    params: WithdrawOperationFundParams,
) {
    return treasury.connect(deployer).withdrawOperationFund(
        params.operator,
        params.value,
        params.signatures,
    );
}