import { Marketplace } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";

export async function callMarketPlace_Pause(
    marketplace: Marketplace,
    admins: any[],
    nonce: number
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [marketplace.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce++);

    await callTransaction(marketplace.pause(signatures));
}

export async function callMarketPlace_Unpause(
    marketplace: Marketplace,
    admins: any[],
    nonce: number
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [marketplace.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce++);

    await callTransaction(marketplace.unpause(signatures));
}

export async function callMarketplace_UpdateExclusiveRate(
    marketplace: Marketplace,
    admins: any[],
    exclusiveRate: number,
    nonce: number
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [marketplace.address, "updateexclusiveRate", exclusiveRate]
    );
    const signatures = await getSignatures(message, admins, nonce++);

    await callTransaction(marketplace.updateexclusiveRate(exclusiveRate, signatures));
}

export async function callMarketplace_UpdateCommissionRate(
    marketplace: Marketplace,
    admins: any[],
    commissionRate: number,
    nonce: number
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [marketplace.address, "updateCommissionRate", commissionRate]
    );
    const signatures = await getSignatures(message, admins, nonce++);

    await callTransaction(marketplace.updateCommissionRate(commissionRate, signatures));
}
