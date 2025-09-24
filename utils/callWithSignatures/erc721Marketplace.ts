import { ERC721Marketplace } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";

export async function callERC721Marketplace_RegisterCollections(
    erc721Marketplace: ERC721Marketplace,
    admins: any[],
    collections: string[],
    isCollection: boolean,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [erc721Marketplace.address, "registerCollections", collections, isCollection]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(erc721Marketplace.registerCollections(collections, isCollection, signatures));
}
