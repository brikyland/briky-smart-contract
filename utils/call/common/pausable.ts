import { Admin } from "@typechain-types";
import { Contract } from "ethers";
import {
    getPauseSignatures,
    getUnpauseSignatures,
} from "@utils/signatures/common/pausable";
import { callTransaction } from "@utils/blockchain";

export async function callPausable_Pause(
    pausable: Contract,
    deployer: any,
    admins: any[],
    admin: Admin,
) {
    const signatures = await getPauseSignatures(pausable, admins, admin);
    await callTransaction(pausable.connect(deployer).pause(signatures));
}

export async function callPausable_Unpause(
    pausable: Contract,
    deployer: any,
    admins: any[],
    admin: Admin,
) {
    const signatures = await getUnpauseSignatures(pausable, admins, admin);
    await callTransaction(pausable.connect(deployer).unpause(signatures));
}