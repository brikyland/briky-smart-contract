import { ReserveVault } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callReserveVault_AuthorizeProvider(
    reserveVault: ReserveVault | MockContract<ReserveVault>,
    admins: any[],
    accounts: any[],
    isProvider: boolean,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [reserveVault.address, "authorizeProvider", accounts, isProvider]
    );

    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(reserveVault.authorizeProvider(accounts, isProvider, signatures));
}
