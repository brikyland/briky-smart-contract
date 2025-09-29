import { PrestigePad } from "../../../typechain-types";
import { getSignatures } from "../../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../../blockchain";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

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
