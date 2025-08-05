import { PrestigePad } from "../../typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callPrestigePad_Pause(
    prestigePad: PrestigePad | MockContract<PrestigePad>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [prestigePad.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(prestigePad.pause(signatures));
}

export async function callPrestigePad_Unpause(
    prestigePad: PrestigePad | MockContract<PrestigePad>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [prestigePad.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(prestigePad.unpause(signatures));
}

export async function callPrestigePad_UpdateFeeRate(
    prestigePad: PrestigePad | MockContract<PrestigePad>,
    admins: any[],
    feeRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [prestigePad.address, "updateFeeRate", feeRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(prestigePad.updateFeeRate(feeRate, signatures));
}

export async function callPrestigePad_UpdateBaseUnitPriceRange(
    prestigePad: PrestigePad | MockContract<PrestigePad>,
    admins: any[],
    baseMinUnitPrice: BigNumberish,
    baseMaxUnitPrice: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "uint256"],
        [prestigePad.address, "updateBaseUnitPriceRange", baseMinUnitPrice, baseMaxUnitPrice]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(prestigePad.updateBaseUnitPriceRange(baseMinUnitPrice, baseMaxUnitPrice, signatures));
}
