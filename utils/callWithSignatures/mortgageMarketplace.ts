import { MortgageMarketplace } from "@typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callMortgageMarketplace_RegisterCollections(
    mortgageMarketplace: MortgageMarketplace | MockContract<MortgageMarketplace>,
    admins: any[],
    collections: string[],
    isCollection: boolean,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [mortgageMarketplace.address, "registerCollections", collections, isCollection]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageMarketplace.registerCollections(collections, isCollection, signatures));
}
