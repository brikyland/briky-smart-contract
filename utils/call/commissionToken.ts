import { CommissionToken } from "@typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callCommissionToken_UpdateRoyaltyRate(
    commissionToken: CommissionToken | MockContract<CommissionToken>,
    admins: any[],
    royaltyRate: BigNumberish,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [commissionToken.address, "updateRoyaltyRate", royaltyRate]
    );

    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(commissionToken.updateRoyaltyRate(royaltyRate, signatures));
}

export async function callCommissionToken_UpdateBaseURI(
    commissionToken: CommissionToken | MockContract<CommissionToken>,
    admins: any[],
    baseURI: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [commissionToken.address, "updateBaseURI", baseURI]
    );

    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(commissionToken.updateBaseURI(baseURI, signatures));
}