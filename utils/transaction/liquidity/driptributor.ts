import { Admin, Driptributor } from "@typechain-types";
import {
    DistributeTokensWithDurationParams,
    DistributeTokensWithDurationParamsInput,
    DistributeTokensWithTimestampParams,
    DistributeTokensWithTimestampParamsInput,
    StakeParams,
    UpdateStakeTokensParams,
    UpdateStakeTokensParamsInput,
    WithdrawParams
} from "@utils/models/liquidity/driptributor";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getDistributeTokensWithDurationSignatures, getDistributeTokensWithTimestampSignatures, getUpdateStakeTokensSignatures } from "@utils/signatures/liquidity/driptributor";


// updateStakeTokens
export async function getUpdateStakeTokensTx(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    params: UpdateStakeTokensParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await driptributor.connect(deployer).updateStakeTokens(
        params.stakeToken1,
        params.stakeToken2,
        params.stakeToken3,
        params.signatures,
        txConfig
    );
}

export async function getUpdateStakeTokensTxByInput(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    paramsInput: UpdateStakeTokensParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateStakeTokensParams = {
        ...paramsInput,
        signatures: await getUpdateStakeTokensSignatures(driptributor, paramsInput, admin, admins),
    };
    return getUpdateStakeTokensTx(driptributor, deployer, params, txConfig);
}


// distributeTokensWithDuration
export async function getDistributeTokensWithDurationTx(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    params: DistributeTokensWithDurationParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await driptributor.connect(deployer).distributeTokensWithDuration(
        params.receivers,
        params.amounts,
        params.durations,
        params.notes,
        params.signatures,
        txConfig
    );
}

export async function getDistributeTokensWithDurationTxByInput(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    paramsInput: DistributeTokensWithDurationParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: DistributeTokensWithDurationParams = {
        ...paramsInput,
        signatures: await getDistributeTokensWithDurationSignatures(driptributor, paramsInput, admin, admins),
    };
    return getDistributeTokensWithDurationTx(driptributor, deployer, params, txConfig);
}


// distributeTokensWithTimestamp
export async function getDistributeTokensWithTimestampTx(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    params: DistributeTokensWithTimestampParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await driptributor.connect(deployer).distributeTokensWithTimestamp(
        params.receivers,
        params.amounts,
        params.endAts,
        params.notes,
        params.signatures,
        txConfig
    );
}

export async function getDistributeTokensWithTimestampTxByInput(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    paramsInput: DistributeTokensWithTimestampParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: DistributeTokensWithTimestampParams = {
        ...paramsInput,
        signatures: await getDistributeTokensWithTimestampSignatures(driptributor, paramsInput, admin, admins),
    };
    return getDistributeTokensWithTimestampTx(driptributor, deployer, params, txConfig);
}


// withdraw
export async function getWithdrawTx(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return driptributor.connect(deployer).withdraw(
        params.distributionIds,
        txConfig
    );
}


// stake
export async function getStakeTx(
    driptributor: Driptributor,
    deployer: SignerWithAddress,
    params: StakeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return driptributor.connect(deployer).stake(
        params.distributionIds,
        params.stake1,
        params.stake2,
        txConfig
    );
}
