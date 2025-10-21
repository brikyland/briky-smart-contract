import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, PrimaryToken, ProxyCaller } from '@typechain-types';

// @utils/models/liquidity
import {
    ContributeLiquidityFromBackerRoundParams,
    ContributeLiquidityFromExternalTreasuryParams,
    ContributeLiquidityFromMarketMakerParams,
    ContributeLiquidityFromPrivateSale1Params,
    ContributeLiquidityFromPrivateSale2Params,
    ContributeLiquidityFromPublicSaleParams,
    ContributeLiquidityFromSeedRoundParams,
    ContributeLiquidityFromStakeTokenParams,
    LiquidateParams,
    UnlockForBackerRoundParams,
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
    UpdateTreasuryParamsInput,
} from '@utils/models/liquidity/primaryToken';

// @utils/signatures/liquidity
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
    getUpdateTreasurySignatures,
} from '@utils/signatures/liquidity/primaryToken';

// updateTreasury
export async function getPrimaryTokenTx_UpdateTreasury(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UpdateTreasuryParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).updateTreasury(params.treasury, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UpdateTreasury(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateTreasuryParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateTreasuryParams = {
        ...paramsInput,
        signatures: await getUpdateTreasurySignatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UpdateTreasury(primaryToken, deployer, params, txConfig);
}

// updateStakeTokens
export async function getPrimaryTokenTx_UpdateStakeTokens(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UpdateStakeTokensParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken
        .connect(deployer)
        .updateStakeTokens(params.stakeToken1, params.stakeToken2, params.stakeToken3, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UpdateStakeTokens(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateStakeTokensParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateStakeTokensParams = {
        ...paramsInput,
        signatures: await getUpdateStakeTokensSignatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UpdateStakeTokens(primaryToken, deployer, params, txConfig);
}

// unlockForBackerRound
export async function getPrimaryTokenTx_UnlockForBackerRound(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForBackerRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForBackerRound(params.distributor, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UnlockForBackerRound(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UnlockForBackerRoundParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnlockForBackerRoundParams = {
        ...paramsInput,
        signatures: await getUnlockForBackerRoundSignatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UnlockForBackerRound(primaryToken, deployer, params, txConfig);
}

// unlockForSeedRound
export async function getPrimaryTokenTx_UnlockForSeedRound(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForSeedRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForSeedRound(params.distributor, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UnlockForSeedRound(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UnlockForSeedRoundParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnlockForSeedRoundParams = {
        ...paramsInput,
        signatures: await getUnlockForSeedRoundSignatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UnlockForSeedRound(primaryToken, deployer, params, txConfig);
}

// unlockForPrivateSale1
export async function getPrimaryTokenTx_UnlockForPrivateSale1(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPrivateSale1Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForPrivateSale1(params.distributor, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UnlockForPrivateSale1(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UnlockForPrivateSale1ParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnlockForPrivateSale1Params = {
        ...paramsInput,
        signatures: await getUnlockForPrivateSale1Signatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UnlockForPrivateSale1(primaryToken, deployer, params, txConfig);
}

// unlockForPrivateSale2
export async function getPrimaryTokenTx_UnlockForPrivateSale2(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPrivateSale2Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForPrivateSale2(params.distributor, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UnlockForPrivateSale2(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UnlockForPrivateSale2ParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnlockForPrivateSale2Params = {
        ...paramsInput,
        signatures: await getUnlockForPrivateSale2Signatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UnlockForPrivateSale2(primaryToken, deployer, params, txConfig);
}

// unlockForPublicSale
export async function getPrimaryTokenTx_UnlockForPublicSale(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPublicSaleParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForPublicSale(params.distributor, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UnlockForPublicSale(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UnlockForPublicSaleParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnlockForPublicSaleParams = {
        ...paramsInput,
        signatures: await getUnlockForPublicSaleSignatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UnlockForPublicSale(primaryToken, deployer, params, txConfig);
}

// unlockForCoreTeam
export async function getPrimaryTokenTx_UnlockForCoreTeam(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForCoreTeamParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForCoreTeam(params.distributor, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UnlockForCoreTeam(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UnlockForCoreTeamParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnlockForCoreTeamParams = {
        ...paramsInput,
        signatures: await getUnlockForCoreTeamSignatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UnlockForCoreTeam(primaryToken, deployer, params, txConfig);
}

// unlockForMarketMaker
export async function getPrimaryTokenTx_UnlockForMarketMaker(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForMarketMakerParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForMarketMaker(params.distributor, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UnlockForMarketMaker(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UnlockForMarketMakerParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnlockForMarketMakerParams = {
        ...paramsInput,
        signatures: await getUnlockForMarketMakerSignatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UnlockForMarketMaker(primaryToken, deployer, params, txConfig);
}

// unlockForExternalTreasury
export async function getPrimaryTokenTx_UnlockForExternalTreasury(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForExternalTreasuryParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForExternalTreasury(params.distributor, params.signatures, txConfig);
}

export async function getPrimaryTokenTxByInput_UnlockForExternalTreasury(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    paramsInput: UnlockForExternalTreasuryParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnlockForExternalTreasuryParams = {
        ...paramsInput,
        signatures: await getUnlockForExternalTreasurySignatures(primaryToken, paramsInput, admin, admins),
    };
    return getPrimaryTokenTx_UnlockForExternalTreasury(primaryToken, deployer, params, txConfig);
}

// contributeLiquidityFromBackerRound
export async function getPrimaryTokenTx_ContributeLiquidityFromBackerRound(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromBackerRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromBackerRound(params.liquidity, txConfig);
}

// contributeLiquidityFromSeedRound
export async function getPrimaryTokenTx_ContributeLiquidityFromSeedRound(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromSeedRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromSeedRound(params.liquidity, txConfig);
}

// contributeLiquidityFromPrivateSale1
export async function getPrimaryTokenTx_ContributeLiquidityFromPrivateSale1(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromPrivateSale1Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromPrivateSale1(params.liquidity, txConfig);
}

// contributeLiquidityFromPrivateSale2
export async function getPrimaryTokenTx_ContributeLiquidityFromPrivateSale2(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromPrivateSale2Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromPrivateSale2(params.liquidity, txConfig);
}

// contributeLiquidityFromPublicSale
export async function getPrimaryTokenTx_ContributeLiquidityFromPublicSale(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromPublicSaleParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromPublicSale(params.liquidity, txConfig);
}

// contributeLiquidityFromMarketMaker
export async function getPrimaryTokenTx_ContributeLiquidityFromMarketMaker(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromMarketMakerParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromMarketMaker(params.liquidity, txConfig);
}

// contributeLiquidityFromExternalTreasury
export async function getPrimaryTokenTx_ContributeLiquidityFromExternalTreasury(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromExternalTreasuryParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromExternalTreasury(params.liquidity, txConfig);
}

// contributeLiquidityFromStakeToken
export async function getCallPrimaryTokenTx_ContributeLiquidityFromStakeToken(
    primaryToken: PrimaryToken,
    caller: ProxyCaller,
    params: ContributeLiquidityFromStakeTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        primaryToken.address,
        primaryToken.interface.encodeFunctionData('contributeLiquidityFromStakeToken', [params.liquidity]),
        txConfig
    );
}

// mintForStake
export async function getPrimaryTokenTx_MintForStake(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).mintForStake(txConfig);
}

export async function getCallPrimaryTokenTx_MintForStake(
    primaryToken: PrimaryToken,
    caller: ProxyCaller,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(primaryToken.address, primaryToken.interface.encodeFunctionData('mintForStake'), txConfig);
}

// liquidate
export async function getPrimaryTokenTx_Liquidate(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: LiquidateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).liquidate(params.amount, txConfig);
}
