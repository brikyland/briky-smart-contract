import { Admin, Treasury } from "@typechain-types";
import { WithdrawOperationFundParamsInput } from "@utils/models/liquidity/treasury";
import { getSignatures } from "@utils/blockchain";
import { ethers } from "ethers";

export async function getWithdrawOperationFundSignatures(
    treasury: Treasury,
    paramsInput: WithdrawOperationFundParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "uint256"],
        [treasury.address, "withdrawOperationFund", paramsInput.operator, paramsInput.value]
    );
    const nonce = await admin.nonce();
    return await getSignatures(message, admins, isValid ? nonce : nonce.add(1));
}