import { CommissionToken, ReserveVault } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callReserveVault_Pause(
    reserveVault: ReserveVault | MockContract<ReserveVault>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [reserveVault.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(reserveVault.pause(signatures));
}

export async function callReserveVault_Unpause(
    reserveVault: ReserveVault | MockContract<ReserveVault>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [reserveVault.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(reserveVault.unpause(signatures));
}

export async function callReserveVault_AuthorizeInitiator(
    reserveVault: ReserveVault | MockContract<ReserveVault>,
    admins: any[],
    accounts: any[],
    isInitiator: boolean,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [reserveVault.address, "authorizeInitiator", accounts, isInitiator]
    );

    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(reserveVault.authorizeInitiator(accounts, isInitiator, signatures));
}
