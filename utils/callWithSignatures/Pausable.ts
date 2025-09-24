import { Admin } from "@typechain-types";
import { Contract } from "ethers";
import {
    getPauseSignatures,
    getUnpauseSignatures,
} from "@utils/signatures/Pausable";
import { callTransaction } from "@utils/blockchain";

export async function callPausable_Pause(
    pausable: Contract,
    admins: any[],
    admin: Admin,
) {
    const signatures = await getPauseSignatures(pausable, admins, admin);
    await callTransaction(pausable.pause(signatures));
}

export async function callPausable_Unpause(
    pausable: Contract,
    admins: any[],
    admin: Admin,
) {
    const signatures = await getUnpauseSignatures(pausable, admins, admin);
    await callTransaction(pausable.unpause(signatures));
}