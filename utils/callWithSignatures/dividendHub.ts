import { DividendHub } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callDividendHub_Pause(
    dividendHub: DividendHub | MockContract<DividendHub>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [dividendHub.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(dividendHub.pause(signatures));
}

export async function callDividendHub_Unpause(
    dividendHub: DividendHub | MockContract<DividendHub>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [dividendHub.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(dividendHub.unpause(signatures));
}