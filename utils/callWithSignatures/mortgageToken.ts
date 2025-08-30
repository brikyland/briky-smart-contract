import { MortgageToken } from "@typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callMortgageToken_Pause(
    mortgageToken: MortgageToken | MockContract<MortgageToken>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [mortgageToken.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageToken.pause(signatures));
}

export async function callMortgageToken_Unpause(
    mortgageToken: MortgageToken | MockContract<MortgageToken>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [mortgageToken.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageToken.unpause(signatures));
}

export async function callMortgageToken_UpdateBaseURI(
    mortgageToken: MortgageToken | MockContract<MortgageToken>,
    admins: any[],
    baseURI: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [mortgageToken.address, "updateBaseURI", baseURI]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageToken.updateBaseURI(baseURI, signatures));
}

export async function callMortgageToken_UpdateFeeRate(
    mortgageToken: MortgageToken | MockContract<MortgageToken>,
    admins: any[],
    feeRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [mortgageToken.address, "updateFeeRate", feeRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageToken.updateFeeRate(feeRate, signatures));
}
