import { ERC721Marketplace } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";

export async function callERC721Marketplace_Pause(
    erc721Marketplace: ERC721Marketplace,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [erc721Marketplace.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(erc721Marketplace.pause(signatures));
}

export async function callERC721Marketplace_Unpause(
    erc721Marketplace: ERC721Marketplace,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [erc721Marketplace.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(erc721Marketplace.unpause(signatures));
}

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
