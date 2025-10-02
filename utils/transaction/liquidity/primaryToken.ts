import { PrimaryToken, ProxyCaller } from "@typechain-types";
import {
    ContributeLiquidityFromStakeTokenParams,
    UnlockForBackerRoundParams,
    UnlockForCoreTeamParams,
    UnlockForExternalTreasuryParams,
    UnlockForMarketMakerParams,
    UnlockForPrivateSale1Params,
    UnlockForPrivateSale2Params,
    UnlockForPublicSaleParams,
    UnlockForSeedRoundParams,
    UpdateStakeTokensParams,
    UpdateTreasuryParams,
} from "@utils/models/liquidity/primaryToken";

export async function getUpdateTreasuryTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UpdateTreasuryParams,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).updateTreasury(
        params.treasury,
        params.signatures,
        txConfig
    );
}

export async function getUpdateStakeTokensTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UpdateStakeTokensParams,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).updateStakeTokens(
        params.stakeToken1,
        params.stakeToken2,
        params.stakeToken3,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForBackerRoundTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForBackerRoundParams,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).unlockForBackerRound(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForSeedRoundTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForSeedRoundParams,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).unlockForSeedRound(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForPrivateSale1Tx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPrivateSale1Params,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).unlockForPrivateSale1(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForPrivateSale2Tx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPrivateSale2Params,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).unlockForPrivateSale2(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForPublicSaleTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForPublicSaleParams,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).unlockForPublicSale(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForCoreTeamTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForCoreTeamParams,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).unlockForCoreTeam(
        params.distributor,
        params.signatures,
        txConfig
    );
}
export async function getUnlockForMarketMakerTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForMarketMakerParams,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).unlockForMarketMaker(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getUnlockForExternalTreasuryTx(
    primaryToken: PrimaryToken,
    deployer: SignerWithAddress,
    params: UnlockForExternalTreasuryParams,
    txConfig = {}
) {
    return await primaryToken.connect(deployer).unlockForExternalTreasury(
        params.distributor,
        params.signatures,
        txConfig
    );
}

export async function getCallContributeLiquidityFromStakeTokenTx(
    primaryToken: PrimaryToken,
    caller: ProxyCaller,
    params: ContributeLiquidityFromStakeTokenParams,
    txConfig = {}
) {
    return await caller.call(
        primaryToken.address,
        primaryToken.interface.encodeFunctionData("contributeLiquidityFromStakeToken", [
            params.liquidity,
        ]),
        txConfig
    );
}