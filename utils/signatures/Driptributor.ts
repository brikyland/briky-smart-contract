import { Admin, Driptributor } from "@typechain-types";
import { DistributeTokensWithDurationParamsInput, DistributeTokensWithTimestampParamsInput, UpdateStakeTokensParamsInput } from "@utils/models/Driptributor";
import { ethers } from "ethers";
import { getSignatures } from "@utils/blockchain";

export async function getUpdateStakeTokensSignatures(
    driptributor: Driptributor,
    admins: any[],
    admin: Admin,
    params: UpdateStakeTokensParamsInput
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [driptributor.address, "updateStakeTokens", params.stakeToken1, params.stakeToken2, params.stakeToken3]
    );
    return await getSignatures(message, admins, await admin.nonce());
}

export async function getDistributeTokensWithDurationSignatures(
    driptributor: Driptributor,
    admins: any[],
    admin: Admin,
    params: DistributeTokensWithDurationParamsInput
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "uint40[]", "string[]"],
        [driptributor.address, "distributeTokensWithDuration", params.receivers, params.amounts, params.durations, params.notes]
    );
    return await getSignatures(message, admins, await admin.nonce());
}

export async function getDistributeTokensWithTimestampSignatures(
    driptributor: Driptributor,
    admins: any[],
    admin: Admin,
    params: DistributeTokensWithTimestampParamsInput
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "uint40[]", "string[]"],
        [driptributor.address, "distributeTokensWithTimestamp", params.receivers, params.amounts, params.endAts, params.notes]
    );
    return await getSignatures(message, admins, await admin.nonce());
}