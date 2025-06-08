import { CommissionMarketplace } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callCommissionToken_Pause(
    commissionToken: CommissionMarketplace | MockContract<CommissionMarketplace>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [commissionToken.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(commissionToken.pause(signatures));
}

export async function callCommissionToken_Unpause(
    commissionToken: CommissionMarketplace | MockContract<CommissionMarketplace>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [commissionToken.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(commissionToken.unpause(signatures));
}
