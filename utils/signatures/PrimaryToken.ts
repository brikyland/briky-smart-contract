import { Admin, PrimaryToken } from "@typechain-types";
import {
    UnlockForBackerRoundParamsInput,
    UnlockForCoreTeamParamsInput,
    UnlockForExternalTreasuryParamsInput,
    UnlockForMarketMakerParamsInput,
    UnlockForPrivateSale1ParamsInput,
    UnlockForPrivateSale2ParamsInput,
    UnlockForPublicSaleParamsInput,
    UnlockForSeedRoundParamsInput,
    UpdateStakeTokensParamsInput,
    UpdateTreasuryParamsInput
} from "@utils/models/PrimaryToken";
import { getSignatures } from "@utils/blockchain";
import { ethers } from 'ethers';

export async function getUpdateTreasurySignatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UpdateTreasuryParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "updateTreasury", params.treasury]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateStakeTokensSignatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UpdateStakeTokensParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address", "address"],
        [primaryToken.address, "updateStakeTokens", params.stakeToken1, params.stakeToken2, params.stakeToken3]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForBackerRoundSignatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UnlockForBackerRoundParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForBackerRound", params.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForSeedRoundSignatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UnlockForSeedRoundParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForSeedRound", params.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForPrivateSale1Signatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UnlockForPrivateSale1ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForPrivateSale1", params.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForPrivateSale2Signatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UnlockForPrivateSale2ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForPrivateSale2", params.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForPublicSaleSignatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UnlockForPublicSaleParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForPublicSale", params.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForCoreTeamSignatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UnlockForCoreTeamParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForCoreTeam", params.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForMarketMakerSignatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UnlockForMarketMakerParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForMarketMaker", params.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForExternalTreasurySignatures(
    primaryToken: PrimaryToken,
    admins: any[],
    admin: Admin,
    params: UnlockForExternalTreasuryParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [primaryToken.address, "unlockForExternalTreasury", params.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
