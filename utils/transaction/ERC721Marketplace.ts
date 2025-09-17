import { ERC721Marketplace, ProxyCaller } from "@typechain-types";
import { ethers } from "hardhat";
import { ListParams } from "@utils/models/ERC721Marketplace";

export async function getListTx(
    erc721Marketplace: ERC721Marketplace,
    signer: any,
    params: ListParams
) {
    const tx = await erc721Marketplace.connect(signer).list(
        params.collection,
        params.tokenId,
        params.price,
        params.currency
    );
    return tx;
}

export async function getCallListTx(
    erc721Marketplace: ERC721Marketplace,
    caller: ProxyCaller,
    params: ListParams
) {

    const tx = await caller.call(
        erc721Marketplace.address,
        erc721Marketplace.interface.encodeFunctionData("list", [
            params.collection,
            params.tokenId,
            params.price,
            params.currency
        ])
    );
    return tx;
}
