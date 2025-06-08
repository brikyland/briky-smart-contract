import { CommissionMarketplace } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";

export async function callCommissionMarketplace_Pause(
    commissionMarketplace: CommissionMarketplace,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [commissionMarketplace.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(commissionMarketplace.pause(signatures));
}

export async function callCommissionMarketplace_Unpause(
    commissionMarketplace: CommissionMarketplace,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [commissionMarketplace.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(commissionMarketplace.unpause(signatures));
}
