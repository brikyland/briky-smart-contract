import { PaymentHub } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callPaymentHub_Pause(
    paymentHub: PaymentHub | MockContract<PaymentHub>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [paymentHub.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(paymentHub.pause(signatures));
}

export async function callPaymentHub_Unpause(
    paymentHub: PaymentHub | MockContract<PaymentHub>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [paymentHub.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(paymentHub.unpause(signatures));
}