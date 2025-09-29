import { ProjectToken } from "@typechain-types";
import { getSignatures, callTransaction } from "@utils/blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

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

export async function callProjectToken_UpdateZoneRoyaltyRate(
    projectToken: ProjectToken | MockContract<ProjectToken>,
    admins: any[],
    zone: string,
    royaltyRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32", "uint256"],
        [projectToken.address, "updateZoneRoyaltyRate", zone, royaltyRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectToken.updateZoneRoyaltyRate(zone, royaltyRate, signatures));
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
