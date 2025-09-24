import { ERC721MortgageToken } from "@typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callERC721MortgageToken_UpdateBaseURI(
    erc721MortgageToken: ERC721MortgageToken | MockContract<ERC721MortgageToken>,
    admins: any[],
    baseURI: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [erc721MortgageToken.address, "updateBaseURI", baseURI]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(erc721MortgageToken.updateBaseURI(baseURI, signatures));
}

export async function callERC721MortgageToken_UpdateFeeRate(
    erc721MortgageToken: ERC721MortgageToken | MockContract<ERC721MortgageToken>,
    admins: any[],
    feeRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [erc721MortgageToken.address, "updateFeeRate", feeRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(erc721MortgageToken.updateFeeRate(feeRate, signatures));
}

export async function callERC721MortgageToken_RegisterCollaterals(
    erc721MortgageToken: ERC721MortgageToken | MockContract<ERC721MortgageToken>,
    admins: any[],
    tokens: string[],
    isCollaterals: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [erc721MortgageToken.address, "registerCollaterals", tokens, isCollaterals]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(erc721MortgageToken.registerCollaterals(tokens, isCollaterals, signatures));
}
