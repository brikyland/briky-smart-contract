import { Driptributor } from "../../typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";


export async function callDriptributor_UpdateStakeTokens(
    driptributor: Driptributor,
    admins: any[],
    stakeToken1: string,
    stakeToken2: string,
    stakeToken3: string,
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [driptributor.address, "updateStakeTokens", stakeToken1, stakeToken2, stakeToken3]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(driptributor.updateStakeTokens(stakeToken1, stakeToken2, stakeToken3, signatures));
}

export async function callDriptributor_Pause(
    driptributor: Driptributor,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [driptributor.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);
    
    await callTransaction(driptributor.pause(signatures));
}

export async function callDriptributor_Unpause(
    driptributor: Driptributor,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [driptributor.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(driptributor.unpause(signatures));
}

export async function callDriptributor_DistributeTokensWithDuration(
    driptributor: Driptributor,
    admins: any[],
    receivers: string[],
    amounts: BigNumberish[],
    vestingDurations: BigNumberish[],
    data: string[],
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "uint40[]", "string[]"],
        [driptributor.address, "distributeTokensWithDuration", receivers, amounts, vestingDurations, data]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(driptributor.distributeTokensWithDuration(
        receivers,
        amounts,
        vestingDurations,
        data,
        signatures
    ));
}


export async function callDriptributor_DistributeTokensWithTimestamp(
    driptributor: Driptributor,
    admins: any[],
    receivers: string[],
    amounts: BigNumberish[],
    endAts: BigNumberish[],
    data: string[],
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "uint40[]", "string[]"],
        [driptributor.address, "distributeTokensWithTimestamp", receivers, amounts, endAts, data]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(driptributor.distributeTokensWithTimestamp(
        receivers,
        amounts,
        endAts,
        data,
        signatures
    ));
}
