import { ProjectMarketplace } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callProjectMarketplace_Pause(
    projectMarketplace: ProjectMarketplace | MockContract<ProjectMarketplace>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [projectMarketplace.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectMarketplace.pause(signatures));
}

export async function callProjectMarketplace_Unpause(
    projectMarketplace: ProjectMarketplace | MockContract<ProjectMarketplace>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [projectMarketplace.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectMarketplace.unpause(signatures));
}
