import { EstateToken } from "@typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";

export async function callEstateToken_Pause(
    estateToken: EstateToken,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [estateToken.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateToken.pause(signatures));
}

export async function callEstateToken_Unpause(
    estateToken: EstateToken,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [estateToken.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateToken.unpause(signatures));
}

export async function callEstateToken_UpdateCommissionToken(
    estateToken: EstateToken,
    admins: any[],
    commissionTokenAddress: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [estateToken.address, "updateCommissionToken", commissionTokenAddress]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateToken.updateCommissionToken(commissionTokenAddress, signatures));
}

export async function callEstateToken_UpdateBaseURI(
    estateToken: EstateToken,
    admins: any[],
    baseURI: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [estateToken.address, "updateBaseURI", baseURI]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateToken.updateBaseURI(baseURI, signatures));
}

export async function callEstateToken_UpdateRoyaltyRate(
    estateToken: EstateToken,
    admins: any[],
    royaltyRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [estateToken.address, "updateRoyaltyRate", royaltyRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateToken.updateRoyaltyRate(royaltyRate, signatures));
}

export async function callEstateToken_AuthorizeTokenizers(
    estateToken: EstateToken,
    admins: any[],
    tokenizers: string[],
    isTokenizer: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [estateToken.address, "authorizeTokenizers", tokenizers, isTokenizer]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateToken.authorizeTokenizers(
        tokenizers,
        isTokenizer,
        signatures
    ));
}
