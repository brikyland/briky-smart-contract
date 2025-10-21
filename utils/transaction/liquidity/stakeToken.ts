import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, StakeToken } from '@typechain-types';

// @utils/models/liquidity
import {
    InitializeRewardingParams,
    InitializeRewardingParamsInput,
    PromoteParams,
    StakeParams,
    TransferParams,
    UnstakeParams,
    UpdateFeeRateParams,
    UpdateFeeRateParamsInput,
} from '@utils/models/liquidity/stakeToken';

// @utils/signatures/liquidity
import { getInitializeRewardingSignatures, getUpdateFeeRateSignatures } from '@utils/signatures/liquidity/stakeToken';

// initializeRewarding
export async function getStakeTokenTx_InitializeRewarding(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: InitializeRewardingParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken
        .connect(deployer)
        .initializeRewarding(params.initialLastRewardFetch, params.successor, params.signatures, txConfig);
}

export async function getStakeTokenTxByInput_InitializeRewarding(
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
    return getStakeTokenTx_InitializeRewarding(stakeToken, deployer, params, txConfig);
}

// updateFeeRate
export function getStakeTokenTx_UpdateFeeRate(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: UpdateFeeRateParams,
    txConfig = {}
) {
    return stakeToken.connect(deployer).updateFeeRate(params.feeRate, params.signatures, txConfig);
}

export async function getStakeTokenTxByInput_UpdateFeeRate(
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
    return getStakeTokenTx_UpdateFeeRate(stakeToken, deployer, params, txConfig);
}

// fetchReward
export async function getStakeTokenTx_FetchReward(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).fetchReward(txConfig);
}

// stake
export async function getStakeTokenTx_Stake(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: StakeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).stake(params.account, params.value, txConfig);
}

// unstake
export async function getStakeTokenTx_Unstake(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: UnstakeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).unstake(params.value, txConfig);
}

// promote
export async function getStakeTokenTx_Promote(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: PromoteParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).promote(params.value, txConfig);
}

// transfer
export async function getStakeTokenTx_Transfer(
    stakeToken: StakeToken,
    deployer: SignerWithAddress,
    params: TransferParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return stakeToken.connect(deployer).transfer(params.to, params.amount, txConfig);
}
