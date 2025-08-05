import { ProjectToken } from "../../typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callProjectToken_Pause(
    projectToken: ProjectToken | MockContract<ProjectToken>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [projectToken.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectToken.pause(signatures));
}

export async function callProjectToken_Unpause(
    projectToken: ProjectToken | MockContract<ProjectToken>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [projectToken.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectToken.unpause(signatures));
}

export async function callProjectToken_UpdateBaseURI(
    projectToken: ProjectToken | MockContract<ProjectToken>,
    admins: any[],
    baseURI: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [projectToken.address, "updateBaseURI", baseURI]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectToken.updateBaseURI(baseURI, signatures));
}

export async function callProjectToken_UpdateRoyaltyRate(
    projectToken: ProjectToken | MockContract<ProjectToken>,
    admins: any[],
    royaltyRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [projectToken.address, "updateRoyaltyRate", royaltyRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectToken.updateRoyaltyRate(royaltyRate, signatures));
}

export async function callProjectToken_AuthorizeLaunchpads(
    projectToken: ProjectToken | MockContract<ProjectToken>,
    admins: any[],
    accounts: any[],
    isLaunchpad: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [projectToken.address, "authorizeLaunchpads", accounts, isLaunchpad]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectToken.authorizeLaunchpads(accounts, isLaunchpad, signatures));
}
