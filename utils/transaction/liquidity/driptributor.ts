import { Driptributor } from "@typechain-types";
import {
    DistributeTokensWithDurationParams,
    DistributeTokensWithTimestampParams,
    UpdateStakeTokensParams
} from "@utils/models/liquidity/driptributor";

export async function getUpdateStakeTokensTx(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    params: UpdateStakeTokensParams,
    txConfig = {}
) {
    return await driptributor.connect(deployer).updateStakeTokens(
        params.stakeToken1,
        params.stakeToken2,
        params.stakeToken3,
        params.signatures,
        txConfig
    );
}

export async function getDistributeTokensWithDurationTx(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    params: DistributeTokensWithDurationParams,
    txConfig = {}
) {
    return await driptributor.connect(deployer).distributeTokensWithDuration(
        params.receivers,
        params.amounts,
        params.durations,
        params.notes,
        params.signatures,
        txConfig
    );
}

export async function getDistributeTokensWithTimestampTx(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    params: DistributeTokensWithTimestampParams,
    txConfig = {}
) {
    return await driptributor.connect(deployer).distributeTokensWithTimestamp(
        params.receivers,
        params.amounts,
        params.endAts,
        params.notes,
        params.signatures,
        txConfig
    );
}