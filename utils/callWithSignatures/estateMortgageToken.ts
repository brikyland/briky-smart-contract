import { EstateMortgageToken } from "@typechain-types";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callEstateMortgageToken_Pause(
    estateMortgageToken: EstateMortgageToken | MockContract<EstateMortgageToken>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [estateMortgageToken.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateMortgageToken.pause(signatures));
}

export async function callEstateMortgageToken_Unpause(
    estateMortgageToken: EstateMortgageToken | MockContract<EstateMortgageToken>,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [estateMortgageToken.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateMortgageToken.unpause(signatures));
}

export async function callEstateMortgageToken_UpdateBaseURI(
    estateMortgageToken: EstateMortgageToken | MockContract<EstateMortgageToken>,
    admins: any[],
    baseURI: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [estateMortgageToken.address, "updateBaseURI", baseURI]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateMortgageToken.updateBaseURI(baseURI, signatures));
}

export async function callEstateMortgageToken_UpdateFeeRate(
    estateMortgageToken: EstateMortgageToken | MockContract<EstateMortgageToken>,
    admins: any[],
    feeRate: BigNumberish,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [estateMortgageToken.address, "updateFeeRate", feeRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateMortgageToken.updateFeeRate(feeRate, signatures));
}
