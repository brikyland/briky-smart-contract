import { Admin, Distributor } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { DistributeTokenParamsInput } from "@utils/models/liquidity/distributor";
import { ethers } from "ethers";


// distributeToken
export async function getDistributeTokenSignatures(
    distributor: Distributor,
    paramsInput: DistributeTokenParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "string"],
        [distributor.address, "distributeToken", paramsInput.receivers, paramsInput.amounts, paramsInput.note]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
