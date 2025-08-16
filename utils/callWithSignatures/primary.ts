import { PrimaryToken } from "@typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";

export async function callPrimaryToken_Pause(
    primaryToken: PrimaryToken,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [primaryToken.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);
    
    await callTransaction(primaryToken.pause(signatures));
}

export async function callPrimaryToken_Unpause(
    primaryToken: PrimaryToken,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [primaryToken.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unpause(signatures));
}

export async function callPrimaryToken_UpdateTreasury(
    primaryToken: PrimaryToken,
    admins: any[],
    treasury: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "updateTreasury", treasury]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.updateTreasury(treasury, signatures));
}

export async function callPrimaryToken_UpdateStakeTokens(
    primaryToken: PrimaryToken,
    admins: any[],
    stakeToken1: string,
    stakeToken2: string,
    stakeToken3: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [primaryToken.address, "updateStakeTokens", stakeToken1, stakeToken2, stakeToken3]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.updateStakeTokens(stakeToken1, stakeToken2, stakeToken3, signatures));
}

export async function callPrimaryToken_UnlockForBackerRound(
    primaryToken: PrimaryToken,
    admins: any[],
    receiver: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForBackerRound", receiver]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unlockForBackerRound(receiver, signatures));
}

export async function callPrimaryToken_UnlockForSeedRound(
    primaryToken: PrimaryToken,
    admins: any[],
    receiver: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForSeedRound", receiver]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unlockForSeedRound(receiver, signatures));
}

export async function callPrimaryToken_UnlockForPrivateSale1(
    primaryToken: PrimaryToken,
    admins: any[],
    receiver: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForPrivateSale1", receiver]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unlockForPrivateSale1(receiver, signatures));
}

export async function callPrimaryToken_UnlockForPrivateSale2(
    primaryToken: PrimaryToken,
    admins: any[],
    receiver: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForPrivateSale2", receiver]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unlockForPrivateSale2(receiver, signatures));
}

export async function callPrimaryToken_UnlockForPublicSale(
    primaryToken: PrimaryToken,
    admins: any[],
    receiver: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForPublicSale", receiver]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unlockForPublicSale(receiver, signatures));
}

export async function callPrimaryToken_UnlockForCoreTeam(
    primaryToken: PrimaryToken,
    admins: any[],
    receiver: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForCoreTeam", receiver]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unlockForCoreTeam(receiver, signatures));
}

export async function callPrimaryToken_UnlockForMarketMaker(
    primaryToken: PrimaryToken,
    admins: any[],
    receiver: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForMarketMaker", receiver]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unlockForMarketMaker(receiver, signatures));
}

export async function callPrimaryToken_UnlockForExternalTreasury(
    primaryToken: PrimaryToken,
    admins: any[],
    receiver: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForExternalTreasury", receiver]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.unlockForExternalTreasury(receiver, signatures));
}
