import { EstateForger } from "../../typechain-types";
import { getSignatures } from "../blockchain";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { BigNumberish } from "ethers";

export async function callEstateForger_UpdateFeeRate(
    estateForger: EstateForger,
    admins: any[],
    royaltyRate: number,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [estateForger.address, "updateFeeRate", royaltyRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.updateFeeRate(royaltyRate, signatures));
}

export async function callEstateForger_UpdateExclusiveRate(
    estateForger: EstateForger,
    admins: any[],
    exclusiveRate: number,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [estateForger.address, "updateExclusiveRate", exclusiveRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.updateExclusiveRate(exclusiveRate, signatures));
}

export async function callEstateForger_UpdateCommissionRate(
    estateForger: EstateForger,
    admins: any[],
    commissionRate: number,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [estateForger.address, "updateCommissionRate", commissionRate]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.updateCommissionRate(commissionRate, signatures));
}

export async function callEstateForger_Pause(
    estateForger: EstateForger,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [estateForger.address, "pause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.pause(signatures));
}

export async function callEstateForger_Unpause(
    estateForger: EstateForger,
    admins: any[],
    nonce: BigNumberish
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string"],
        [estateForger.address, "unpause"]
    );
    let signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.unpause(signatures));
}

export async function callEstateForger_UpdatePriceFeeds(
    estateForger: EstateForger,
    admins: any[],
    currencyAddresses: string[],
    priceFeeds: string[],
    heartbeats: number[],
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "address[]", "uint40[]"],
        [estateForger.address, "updatePriceFeeds", currencyAddresses, priceFeeds, heartbeats]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.updatePriceFeeds(currencyAddresses, priceFeeds, heartbeats, signatures));
}


export async function callEstateForger_UpdateDefaultRates(
    estateForger: EstateForger,
    admins: any[],
    currencyAddresses: string[],
    values: number[],
    decimals: number[],
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "uint256[]", "uint8[]"],
        [estateForger.address, "updateDefaultRates", currencyAddresses, values, decimals]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(estateForger.updateDefaultRates(currencyAddresses, values, decimals, signatures));
}
