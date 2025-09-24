import { EstateForger } from "@typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callEstateForger_UpdateBaseUnitPriceRange(
    estateForger: EstateForger | MockContract<EstateForger>,
    admins: any[],
    baseMinUnitPrice: BigNumberish,
    baseMaxUnitPrice: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "uint256"],
        [estateForger.address, "updateBaseUnitPriceRange", baseMinUnitPrice, baseMaxUnitPrice]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.updateBaseUnitPriceRange(baseMinUnitPrice, baseMaxUnitPrice, signatures));
}

export async function callEstateForger_Whitelist(
    estateForger: EstateForger | MockContract<EstateForger>,
    admins: any[],
    accounts: string[],
    isWhitelisted: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [estateForger.address, "whitelist", accounts, isWhitelisted]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.whitelist(accounts, isWhitelisted, signatures));
}
