import { ProjectMortgageToken } from "@typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callProjectMortgageToken_UpdateBaseURI(
    projectMortgageToken: ProjectMortgageToken | MockContract<ProjectMortgageToken>,
    admins: any[],
    baseURI: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [projectMortgageToken.address, "updateBaseURI", baseURI]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectMortgageToken.updateBaseURI(baseURI, signatures));
}

export async function callProjectMortgageToken_UpdateFeeRate(
    projectMortgageToken: ProjectMortgageToken | MockContract<ProjectMortgageToken>,
    admins: any[],
    feeRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [projectMortgageToken.address, "updateFeeRate", feeRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(projectMortgageToken.updateFeeRate(feeRate, signatures));
}
