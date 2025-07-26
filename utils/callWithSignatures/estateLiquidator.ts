import { EstateForger, EstateLiquidator } from "../../typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callEstateLiquidator_Pause(
    estateLiquidator: EstateLiquidator | MockContract<EstateLiquidator>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [estateLiquidator.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateLiquidator.pause(signatures));
}

export async function callEstateLiquidator_Unpause(
    estateLiquidator: EstateLiquidator | MockContract<EstateLiquidator>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [estateLiquidator.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateLiquidator.unpause(signatures));
}

export async function callEstateForger_UpdateFeeRate(
    estateForger: EstateForger | MockContract<EstateForger>,
    admins: any[],
    feeRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [estateForger.address, "updateFeeRate", feeRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.updateFeeRate(feeRate, signatures));
}
