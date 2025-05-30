import { PrimaryToken } from "../../typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";


export async function callPrimaryToken_UpdateStakeTokens(
    primaryToken: PrimaryToken,
    admins: any[],
    stakeToken1: string,
    stakeToken2: string,
    stakeToken3: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [primaryToken.address, "updateStakeTokens", stakeToken1, stakeToken2, stakeToken3]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(primaryToken.updateStakeTokens(stakeToken1, stakeToken2, stakeToken3, signatures));
}
