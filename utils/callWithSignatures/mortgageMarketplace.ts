import { MortgageMarketplace, MortgageToken } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callMortgageMarketplace_Pause(
    mortgageMarketplace: MortgageMarketplace | MockContract<MortgageMarketplace>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [mortgageMarketplace.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageMarketplace.pause(signatures));
}

export async function callMortgageMarketplace_Unpause(
    mortgageMarketplace: MortgageMarketplace | MockContract<MortgageMarketplace>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [mortgageMarketplace.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageMarketplace.unpause(signatures));
}
