import { StakeToken } from "@typechain-types";
import { InitializeRewardingParams, UpdateFeeRateParams } from "@utils/models/StakeToken";

export function getInitializeRewardingTx(
    stakeToken: StakeToken,
    deployer: any,
    params: InitializeRewardingParams,
    txConfig = {}
) {
    return stakeToken.connect(deployer).initializeRewarding(
        params.initialLastRewardFetch,
        params.successor,
        params.signatures,
        txConfig
    );
}

export function getUpdateFeeRateTx(
    stakeToken: StakeToken,
    deployer: any,
    params: UpdateFeeRateParams,
    txConfig = {}
) {
    return stakeToken.connect(deployer).updateFeeRate(
        params.feeRate,
        params.signatures,
        txConfig
    );
}