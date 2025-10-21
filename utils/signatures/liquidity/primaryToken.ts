import { ethers } from 'ethers';

// @typechain-types
import { Admin, PrimaryToken } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/liquidity
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
    UpdateTreasuryParamsInput,
} from '@utils/models/liquidity/primaryToken';

// updateTreasury
export async function getUpdateTreasurySignatures(
    primaryToken: PrimaryToken,
    paramsInput: UpdateTreasuryParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'updateTreasury', paramsInput.treasury]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// updateStakeTokens
export async function getUpdateStakeTokensSignatures(
    primaryToken: PrimaryToken,
    paramsInput: UpdateStakeTokensParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address', 'address', 'address'],
        [
            primaryToken.address,
            'updateStakeTokens',
            paramsInput.stakeToken1,
            paramsInput.stakeToken2,
            paramsInput.stakeToken3,
        ]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// unlockForBackerRound
export async function getUnlockForBackerRoundSignatures(
    primaryToken: PrimaryToken,
    paramsInput: UnlockForBackerRoundParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'unlockForBackerRound', paramsInput.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForSeedRoundSignatures(
    primaryToken: PrimaryToken,
    paramsInput: UnlockForSeedRoundParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'unlockForSeedRound', paramsInput.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForPrivateSale1Signatures(
    primaryToken: PrimaryToken,
    paramsInput: UnlockForPrivateSale1ParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'unlockForPrivateSale1', paramsInput.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForPrivateSale2Signatures(
    primaryToken: PrimaryToken,
    paramsInput: UnlockForPrivateSale2ParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'unlockForPrivateSale2', paramsInput.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForPublicSaleSignatures(
    primaryToken: PrimaryToken,
    paramsInput: UnlockForPublicSaleParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'unlockForPublicSale', paramsInput.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForCoreTeamSignatures(
    primaryToken: PrimaryToken,
    paramsInput: UnlockForCoreTeamParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'unlockForCoreTeam', paramsInput.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForMarketMakerSignatures(
    primaryToken: PrimaryToken,
    paramsInput: UnlockForMarketMakerParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'unlockForMarketMaker', paramsInput.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUnlockForExternalTreasurySignatures(
    primaryToken: PrimaryToken,
    paramsInput: UnlockForExternalTreasuryParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [primaryToken.address, 'unlockForExternalTreasury', paramsInput.distributor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
