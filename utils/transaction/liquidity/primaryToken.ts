import { Admin, PrimaryToken, ProxyCaller } from "@typechain-types";
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
} from "@utils/models/liquidity/primaryToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getUnlockForBackerRoundSignatures, getUnlockForCoreTeamSignatures, getUnlockForExternalTreasurySignatures, getUnlockForMarketMakerSignatures, getUnlockForPrivateSale1Signatures, getUnlockForPrivateSale2Signatures, getUnlockForPublicSaleSignatures, getUnlockForSeedRoundSignatures, getUpdateStakeTokensSignatures, getUpdateTreasurySignatures } from "@utils/signatures/liquidity/primaryToken";


// updateTreasury
export async function getUpdateTreasuryTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UpdateTreasuryParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).updateTreasury(
        params.treasury,
        params.signatures,
        txConfig
    );
}

export async function getUpdateTreasuryTxByInput(
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
    return getUpdateTreasuryTx(primaryToken, deployer, params, txConfig);
}


// updateStakeTokens
export async function getUpdateStakeTokensTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UpdateStakeTokensParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).updateStakeTokens(
        params.stakeToken1,
        params.stakeToken2,
        params.stakeToken3,
        params.signatures,
        txConfig
    );
}

export async function getUpdateStakeTokensTxByInput(
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
    return getUpdateStakeTokensTx(primaryToken, deployer, params, txConfig);
}


// unlockForBackerRound
export async function getUnlockForBackerRoundTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForBackerRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForBackerRound(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForBackerRoundTxByInput(
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
    return getUnlockForBackerRoundTx(primaryToken, deployer, params, txConfig);
}


// unlockForSeedRound
export async function getUnlockForSeedRoundTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForSeedRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForSeedRound(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForSeedRoundTxByInput(
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
    return getUnlockForSeedRoundTx(primaryToken, deployer, params, txConfig);
}


// unlockForPrivateSale1
export async function getUnlockForPrivateSale1Tx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPrivateSale1Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForPrivateSale1(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForPrivateSale1TxByInput(
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
    return getUnlockForPrivateSale1Tx(primaryToken, deployer, params, txConfig);
}


// unlockForPrivateSale2
export async function getUnlockForPrivateSale2Tx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPrivateSale2Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForPrivateSale2(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForPrivateSale2TxByInput(
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
    return getUnlockForPrivateSale2Tx(primaryToken, deployer, params, txConfig);
}


// unlockForPublicSale
export async function getUnlockForPublicSaleTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPublicSaleParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForPublicSale(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForPublicSaleTxByInput(
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
    return getUnlockForPublicSaleTx(primaryToken, deployer, params, txConfig);
}


// unlockForCoreTeam
export async function getUnlockForCoreTeamTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForCoreTeamParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForCoreTeam(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForCoreTeamTxByInput(
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
    return getUnlockForCoreTeamTx(primaryToken, deployer, params, txConfig);
}


// unlockForMarketMaker
export async function getUnlockForMarketMakerTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForMarketMakerParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForMarketMaker(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForMarketMakerTxByInput(
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
    return getUnlockForMarketMakerTx(primaryToken, deployer, params, txConfig);
}


// unlockForExternalTreasury
export async function getUnlockForExternalTreasuryTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForExternalTreasuryParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).unlockForExternalTreasury(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForExternalTreasuryTxByInput(
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
    return getUnlockForExternalTreasuryTx(primaryToken, deployer, params, txConfig);
}


// contributeLiquidityFromBackerRound
export async function getContributeLiquidityFromBackerRoundTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromBackerRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromBackerRound(
        params.liquidity,
        txConfig
    );
}


// contributeLiquidityFromSeedRound
export async function getContributeLiquidityFromSeedRoundTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromSeedRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromSeedRound(
        params.liquidity,
        txConfig
    );
}


// contributeLiquidityFromPrivateSale1
export async function getContributeLiquidityFromPrivateSale1Tx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromPrivateSale1Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromPrivateSale1(
        params.liquidity,
        txConfig
    );
}


// contributeLiquidityFromPrivateSale2
export async function getContributeLiquidityFromPrivateSale2Tx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromPrivateSale2Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromPrivateSale2(
        params.liquidity,
        txConfig
    );
}


// contributeLiquidityFromPublicSale
export async function getContributeLiquidityFromPublicSaleTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromPublicSaleParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromPublicSale(
        params.liquidity,
        txConfig
    );
}


// contributeLiquidityFromMarketMaker
export async function getContributeLiquidityFromMarketMakerTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromMarketMakerParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromMarketMaker(
        params.liquidity,
        txConfig
    );
}


// contributeLiquidityFromExternalTreasury
export async function getContributeLiquidityFromExternalTreasuryTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: ContributeLiquidityFromExternalTreasuryParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).contributeLiquidityFromExternalTreasury(
        params.liquidity,
        txConfig
    );
}


// contributeLiquidityFromStakeToken
export async function getCallContributeLiquidityFromStakeTokenTx(
    primaryToken: PrimaryToken,
    caller: ProxyCaller,
    params: ContributeLiquidityFromStakeTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        primaryToken.address,
        primaryToken.interface.encodeFunctionData("contributeLiquidityFromStakeToken", [
            params.liquidity,
        ]),
        txConfig
    );
}


// mintForStake
export async function getMintForStakeTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).mintForStake(
        txConfig
    );
}


// liquidate
export async function getLiquidateTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: LiquidateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return primaryToken.connect(deployer).liquidate(
        params.amount,
        txConfig
    );
}