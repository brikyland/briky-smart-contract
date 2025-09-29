import { Admin } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { Contract, ethers } from "ethers";

export async function getPauseSignatures(
    pausable: Contract,
    admins: any[],
    admin: Admin,
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [pausable.address, "pause"]
    );
    return await getSignatures(message, admins, await admin.nonce());
}

export async function getPauseInvalidSignatures(
    pausable: Contract,
    admins: any[],
    admin: Admin,
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [pausable.address, "pause"]
    );
    return await getSignatures(message, admins, (await admin.nonce()).add(1));
}

export async function getUnpauseSignatures(
    pausable: Contract,
    admins: any[],
    admin: Admin,
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [pausable.address, "unpause"]
    );
    return await getSignatures(message, admins, await admin.nonce());
}

export async function getUnpauseInvalidSignatures(
    pausable: Contract,
    admins: any[],
    admin: Admin,
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [pausable.address, "unpause"]
    );
    return await getSignatures(message, admins, (await admin.nonce()).add(1));
}