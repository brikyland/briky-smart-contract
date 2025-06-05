import { MortgageToken } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";

export async function callMortgageToken_Pause(
    mortgageToken: MortgageToken,
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
    mortgageToken: MortgageToken,
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

export async function callMortgageToken_UpdateFeeRate(
    mortgageToken: MortgageToken,
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

export async function callMortgageToken_UpdateExclusiveRate(
    mortgageToken: MortgageToken,
    admins: any[],
    exclusiveRate: number,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [mortgageToken.address, "updateExclusiveRate", exclusiveRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageToken.updateExclusiveRate(exclusiveRate, signatures));
}

export async function callMortgageToken_UpdateCommissionRate(
    mortgageToken: MortgageToken,
    admins: any[],
    commissionRate: number,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [mortgageToken.address, "updateCommissionRate", commissionRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(mortgageToken.updateCommissionRate(commissionRate, signatures));
}
