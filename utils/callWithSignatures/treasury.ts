import { Treasury } from "@typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callTreasury_Pause(
    treasury: Treasury | MockContract<Treasury>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [treasury.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);
    
    await callTransaction(treasury.pause(signatures));
}

export async function callTreasury_Unpause(
    treasury: Treasury | MockContract<Treasury>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [treasury.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(treasury.unpause(signatures));
}
