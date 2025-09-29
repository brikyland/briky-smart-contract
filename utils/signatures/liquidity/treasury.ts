import { Admin, Treasury } from "@typechain-types";
import { WithdrawOperationFundParamsInput } from "@utils/models/liquidity/treasury";
import { getSignatures } from "@utils/blockchain";
import { ethers } from "ethers";

export async function getWithdrawOperationFundSignatures(
    treasury: Treasury,
    admins: any[],
    admin: Admin,
    params: WithdrawOperationFundParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "uint256"],
        [treasury.address, "withdrawOperationFund", params.operator, params.value]
    );
    const nonce = await admin.nonce();
    return await getSignatures(message, admins, isValid ? nonce : nonce.add(1));
}