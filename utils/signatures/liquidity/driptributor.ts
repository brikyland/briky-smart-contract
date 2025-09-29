import { Admin, Driptributor } from "@typechain-types";
import { DistributeTokensWithDurationParamsInput, DistributeTokensWithTimestampParamsInput, UpdateStakeTokensParamsInput } from "@utils/models/liquidity/driptributor";
import { ethers } from "ethers";
import { getSignatures } from "@utils/blockchain";

export async function getUpdateStakeTokensSignatures(
    driptributor: Driptributor,
    admins: any[],
    admin: Admin,
    params: UpdateStakeTokensParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [driptributor.address, "updateStakeTokens", params.stakeToken1, params.stakeToken2, params.stakeToken3]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getDistributeTokensWithDurationSignatures(
    driptributor: Driptributor,
    admins: any[],
    admin: Admin,
    params: DistributeTokensWithDurationParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "uint40[]", "string[]"],
        [driptributor.address, "distributeTokensWithDuration", params.receivers, params.amounts, params.durations, params.notes]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getDistributeTokensWithTimestampSignatures(
    driptributor: Driptributor,
    admins: any[],
    admin: Admin,
    params: DistributeTokensWithTimestampParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "uint40[]", "string[]"],
        [driptributor.address, "distributeTokensWithTimestamp", params.receivers, params.amounts, params.endAts, params.notes]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
