import { Admin, Auction } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { StartAuctionParamsInput, UpdateStakeTokensParamsInput } from "@utils/models/Auction";
import { ethers } from "ethers";

export async function getUpdateStakeTokensSignatures(
    auction: Auction,
    admins: any[],
    admin: Admin,
    params: UpdateStakeTokensParamsInput
) {            
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [auction.address, "updateStakeTokens", params.stakeToken1, params.stakeToken2, params.stakeToken3]
    );
    return await getSignatures(message, admins, await admin.nonce());
}

export async function getUpdateStakeTokensInvalidSignatures(
    auction: Auction,
    admins: any[],
    admin: Admin,
    params: UpdateStakeTokensParamsInput
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [auction.address, "updateStakeTokens", params.stakeToken1, params.stakeToken2, params.stakeToken3]
    );
    return await getSignatures(message, admins, (await admin.nonce()).add(1));
}

export async function getStartAuctionSignatures(
    auction: Auction,
    admins: any[],
    admin: Admin,
    params: StartAuctionParamsInput
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "uint256"],
        [auction.address, "startAuction", params.endAt, params.vestingDuration]
    );
    return await getSignatures(message, admins, await admin.nonce());
}

export async function getStartAuctionInvalidSignatures(
    auction: Auction,
    admins: any[],
    admin: Admin,
    params: StartAuctionParamsInput
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "uint256"],
        [auction.address, "startAuction", params.endAt, params.vestingDuration]
    );
    return await getSignatures(message, admins, (await admin.nonce()).add(1));
}