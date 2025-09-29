import { Admin, Driptributor } from "@typechain-types";
import { callTransaction } from "../../blockchain";
import { 
    DistributeTokensWithDurationParams,
    DistributeTokensWithDurationParamsInput,
    DistributeTokensWithTimestampParams,
    DistributeTokensWithTimestampParamsInput,
    UpdateStakeTokensParams,
    UpdateStakeTokensParamsInput,
} from "@utils/models/liquidity/driptributor";
import {
    getDistributeTokensWithDurationSignatures,
    getDistributeTokensWithTimestampSignatures,
    getUpdateStakeTokensSignatures,
} from "@utils/signatures/liquidity/driptributor";
import {
    getDistributeTokensWithDurationTx,
    getDistributeTokensWithTimestampTx,
    getUpdateStakeTokensTx,
} from "@utils/transaction/liquidity/driptributor";

export async function callDriptributor_UpdateStakeTokens(
    driptributor: Driptributor,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateStakeTokensParamsInput,
) {
    const params: UpdateStakeTokensParams = {
        ...paramsInput,
        signatures: await getUpdateStakeTokensSignatures(driptributor, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateStakeTokensTx(driptributor, deployer, params));
}

export async function callDriptributor_DistributeTokensWithDuration(
    driptributor: Driptributor,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: DistributeTokensWithDurationParamsInput,
) {
    const params: DistributeTokensWithDurationParams = {
        ...paramsInput,
        signatures: await getDistributeTokensWithDurationSignatures(driptributor, admins, admin, paramsInput),
    };
    await callTransaction(getDistributeTokensWithDurationTx(driptributor, deployer, params));
}

export async function callDriptributor_DistributeTokensWithTimestamp(
    driptributor: Driptributor,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: DistributeTokensWithTimestampParamsInput,
) {
    const params: DistributeTokensWithTimestampParams = {
        ...paramsInput,
        signatures: await getDistributeTokensWithTimestampSignatures(driptributor, admins, admin, paramsInput),
    };
    await callTransaction(getDistributeTokensWithTimestampTx(driptributor, deployer, params));
}
