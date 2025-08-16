import { StakeToken, Treasury } from "@typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";

export async function callStakeToken_InitializeRewarding(
    stakeToken: StakeToken,
    admins: any[],
    initialLastRewardFetch: BigNumberish,
    successor: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "address"],
        [stakeToken.address, "initializeRewarding", initialLastRewardFetch, successor]
    );
    let signatures = await getSignatures(message, admins, nonce);
    
    await callTransaction(stakeToken.initializeRewarding(initialLastRewardFetch, successor, signatures));
}

export async function callStakeToken_UpdateFeeRate(
    stakeToken: StakeToken,
    admins: any[],
    feeRate: BigNumberish,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [stakeToken.address, "updateFeeRate", feeRate]
    );
    let signatures = await getSignatures(message, admins, nonce);
    
    await callTransaction(stakeToken.updateFeeRate(feeRate, signatures));
}

export async function callStakeToken_Pause(
    stakeToken: StakeToken,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [stakeToken.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(stakeToken.pause(signatures));
}

export async function callStakeToken_Unpause(
    stakeToken: StakeToken,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [stakeToken.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(stakeToken.unpause(signatures));
}
