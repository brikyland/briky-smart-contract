import { Admin, StakeToken } from "@typechain-types";
import { InitializeRewardingParams, InitializeRewardingParamsInput, PromoteParams, StakeParams, UnstakeParams, UpdateFeeRateParams, UpdateFeeRateParamsInput } from "@utils/models/liquidity/stakeToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getInitializeRewardingSignatures, getUpdateFeeRateSignatures } from "@utils/signatures/liquidity/stakeToken";


// initializeRewarding
export async function getInitializeRewardingTx(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: InitializeRewardingParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).initializeRewarding(
        params.initialLastRewardFetch,
        params.successor,
        params.signatures,
        txConfig
    );
}

export async function getInitializeRewardingTxByInput(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    paramsInput: InitializeRewardingParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: InitializeRewardingParams = {
        ...paramsInput,
        signatures: await getInitializeRewardingSignatures(stakeToken, paramsInput, admin, admins),
    };
    return getInitializeRewardingTx(stakeToken, deployer, params, txConfig);
}


// updateFeeRate
export function getUpdateFeeRateTx(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: UpdateFeeRateParams,
    txConfig = {}
) {
    return stakeToken.connect(deployer).updateFeeRate(
        params.feeRate,
        params.signatures,
        txConfig
    );
}

export async function getUpdateFeeRateTxByInput(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateFeeRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateFeeRateParams = {
        ...paramsInput,
        signatures: await getUpdateFeeRateSignatures(stakeToken, paramsInput, admin, admins),
    };
    return getUpdateFeeRateTx(stakeToken, deployer, params, txConfig);
}


// fetchReward
export async function getFetchRewardTx(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).fetchReward(txConfig);
}


// stake
export async function getStakeTx(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: StakeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).stake(
        params.account,
        params.value,
        txConfig
    );
}


// unstake
export async function getUnstakeTx(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: UnstakeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).unstake(
        params.value,
        txConfig
    );
}


// promote
export async function getPromoteTx(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: PromoteParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).promote(
        params.value,
        txConfig
    );
}