import { Auction } from "../../typechain-types";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callAuction_Pause(
    auction: Auction | MockContract<Auction>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [auction.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);
    
    await callTransaction(auction.pause(signatures));
}

export async function callAuction_Unpause(
    auction: Auction | MockContract<Auction>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [auction.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(auction.unpause(signatures));
}

export async function callAuction_UpdateStakeTokens(
    auction: Auction | MockContract<Auction>,
    admins: any[],
    stakeToken1: string,
    stakeToken2: string,
    stakeToken3: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [auction.address, "updateStakeTokens", stakeToken1, stakeToken2, stakeToken3]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(auction.updateStakeTokens(stakeToken1, stakeToken2, stakeToken3, signatures));
}

export async function callAuction_StartAuction(
    auction: Auction | MockContract<Auction>,
    admins: any[],
    endAt: BigNumberish,
    vestingDuration: BigNumberish,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "uint256"],
        [auction.address, "startAuction", endAt, vestingDuration]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(auction.startAuction(endAt, vestingDuration, signatures));
}
