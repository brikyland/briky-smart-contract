import { PromotionToken } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callPromotionToken_CreateContents(
    promotionToken: PromotionToken | MockContract<PromotionToken>,
    admins: any[],
    uris: string[],
    startAts: number[],
    durations: number[],
    nonce: BigNumberish,
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string[]", "uint40[]", "uint40[]"],
        [promotionToken.address, "createContents", uris, startAts, durations]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(promotionToken.createContents(uris, startAts, durations, signatures));
}

export async function callPromotionToken_CancelContents(
    promotionToken: PromotionToken | MockContract<PromotionToken>,
    admins: any[],
    contentIds: BigNumberish[],
    nonce: BigNumberish,
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256[]"],
        [promotionToken.address, "cancelContents", contentIds]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(promotionToken.cancelContents(contentIds, signatures));
}
