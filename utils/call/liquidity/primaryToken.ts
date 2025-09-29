import { Admin, PrimaryToken } from "@typechain-types";
import { callTransaction } from "@utils/blockchain";
import { UnlockForBackerRoundParams,
    UnlockForBackerRoundParamsInput,
    UnlockForCoreTeamParams,
    UnlockForCoreTeamParamsInput,
    UnlockForExternalTreasuryParams,
    UnlockForExternalTreasuryParamsInput,
    UnlockForMarketMakerParams,
    UnlockForMarketMakerParamsInput,
    UnlockForPrivateSale1Params,
    UnlockForPrivateSale1ParamsInput,
    UnlockForPrivateSale2Params,
    UnlockForPrivateSale2ParamsInput,
    UnlockForPublicSaleParams,
    UnlockForPublicSaleParamsInput,
    UnlockForSeedRoundParams,
    UnlockForSeedRoundParamsInput,
    UpdateStakeTokensParams,
    UpdateStakeTokensParamsInput,
    UpdateTreasuryParams,
    UpdateTreasuryParamsInput
} from "@utils/models/liquidity/primaryToken";
import { 
    getUnlockForBackerRoundSignatures,
    getUnlockForCoreTeamSignatures,
    getUnlockForExternalTreasurySignatures,
    getUnlockForMarketMakerSignatures,
    getUnlockForPrivateSale1Signatures,
    getUnlockForPrivateSale2Signatures,
    getUnlockForPublicSaleSignatures,
    getUnlockForSeedRoundSignatures,
    getUpdateStakeTokensSignatures,
    getUpdateTreasurySignatures 
} from "@utils/signatures/liquidity/primaryToken";
import {
    getUnlockForBackerRoundTx,
    getUnlockForCoreTeamTx,
    getUnlockForExternalTreasuryTx,
    getUnlockForMarketMakerTx,
    getUnlockForPrivateSale1Tx,
    getUnlockForPrivateSale2Tx,
    getUnlockForPublicSaleTx,
    getUnlockForSeedRoundTx,
    getUpdateStakeTokensTx,
    getUpdateTreasuryTx
} from "@utils/transaction/liquidity/primaryToken";


export async function callPrimaryToken_UpdateTreasury(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateTreasuryParamsInput,
) {
    const params: UpdateTreasuryParams = {
        ...paramsInput,
        signatures: await getUpdateTreasurySignatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateTreasuryTx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UpdateStakeTokens(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateStakeTokensParamsInput,
) {
    const params: UpdateStakeTokensParams = {
        ...paramsInput,
        signatures: await getUpdateStakeTokensSignatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateStakeTokensTx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UnlockForBackerRound(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UnlockForBackerRoundParamsInput,
) {
    const params: UnlockForBackerRoundParams = {
        ...paramsInput,
        signatures: await getUnlockForBackerRoundSignatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUnlockForBackerRoundTx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UnlockForSeedRound(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UnlockForSeedRoundParamsInput,
) {
    const params: UnlockForSeedRoundParams = {
        ...paramsInput,
        signatures: await getUnlockForSeedRoundSignatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUnlockForSeedRoundTx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UnlockForPrivateSale1(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UnlockForPrivateSale1ParamsInput,
) {
    const params: UnlockForPrivateSale1Params = {
        ...paramsInput,
        signatures: await getUnlockForPrivateSale1Signatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUnlockForPrivateSale1Tx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UnlockForPrivateSale2(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UnlockForPrivateSale2ParamsInput,
) {
    const params: UnlockForPrivateSale2Params = {
        ...paramsInput,
        signatures: await getUnlockForPrivateSale2Signatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUnlockForPrivateSale2Tx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UnlockForPublicSale(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UnlockForPublicSaleParamsInput,
) {
    const params: UnlockForPublicSaleParams = {
        ...paramsInput,
        signatures: await getUnlockForPublicSaleSignatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUnlockForPublicSaleTx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UnlockForCoreTeam(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UnlockForCoreTeamParamsInput,
) {
    const params: UnlockForCoreTeamParams = {
        ...paramsInput,
        signatures: await getUnlockForCoreTeamSignatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUnlockForCoreTeamTx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UnlockForMarketMaker(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UnlockForMarketMakerParamsInput,
) {
    const params: UnlockForMarketMakerParams = {
        ...paramsInput,
        signatures: await getUnlockForMarketMakerSignatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUnlockForMarketMakerTx(primaryToken, deployer, params));
}

export async function callPrimaryToken_UnlockForExternalTreasury(
    primaryToken: PrimaryToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UnlockForExternalTreasuryParamsInput,
) {
    const params: UnlockForExternalTreasuryParams = {
        ...paramsInput,
        signatures: await getUnlockForExternalTreasurySignatures(primaryToken, admins, admin, paramsInput),
    };
    await callTransaction(getUnlockForExternalTreasuryTx(primaryToken, deployer, params));
}
