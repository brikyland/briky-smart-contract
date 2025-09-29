import { Admin, Distributor } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { DistributeTokenParamsInput } from "@utils/models/liquidity/distributor";
import { ethers } from "ethers";

export async function getDistributeTokenSignatures(
    distributor: Distributor,
    admins: any[],
    admin: Admin,
    params: DistributeTokenParamsInput
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "string"],
        [distributor.address, "distributeToken", params.receivers, params.amounts, params.note]
    );
    return await getSignatures(message, admins, await admin.nonce());
}

export async function getDistributeTokenInvalidSignatures(
    distributor: Distributor,
    admins: any[],
    admin: Admin,
    params: DistributeTokenParamsInput
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "string"],
        [distributor.address, "distributeToken", params.receivers, params.amounts, params.note]
    );
    return await getSignatures(message, admins, (await admin.nonce()).add(1));
}