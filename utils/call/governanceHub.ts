import { GovernanceHub } from "../../typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callGovernanceHub_UpdateFee(
    governanceHub: GovernanceHub | MockContract<GovernanceHub>,
    admins: any[],
    fee: BigNumberish,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [governanceHub.address, "updateFee", fee]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(governanceHub.updateFee(fee, signatures));
}