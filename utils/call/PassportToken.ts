import { Admin, PassportToken } from "@typechain-types";
import { callTransaction } from "@utils/blockchain";
import {
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeParams,
    UpdateFeeParamsInput,
    UpdateRoyaltyRateParams,
    UpdateRoyaltyRateParamsInput,
    WithdrawParams,
    WithdrawParamsInput
} from "@utils/models/PassportToken";
import {
    getUpdateBaseURISignatures,
    getUpdateFeeSignatures,
    getUpdateRoyaltyRateSignatures,
    getWithdrawSignatures
} from "@utils/signatures/PassportToken";
import {
    getUpdateBaseURITx,
    getUpdateFeeTx,
    getUpdateRoyaltyRateTx,
    getWithdrawTx
} from "@utils/transaction/PassportToken";

export async function callPassportToken_UpdateBaseURI(
    passportToken: PassportToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateBaseURIParamsInput
) {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(passportToken, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateBaseURITx(passportToken, deployer, params));
}

export async function callPassportToken_UpdateFee(
    passportToken: PassportToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateFeeParamsInput
) {
    const params: UpdateFeeParams = {
        ...paramsInput,
        signatures: await getUpdateFeeSignatures(passportToken, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateFeeTx(passportToken, deployer, params));
}

export async function callPassportToken_UpdateRoyaltyRate(
    passportToken: PassportToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateRoyaltyRateParamsInput
) {
    const params: UpdateRoyaltyRateParams = {
        ...paramsInput,
        signatures: await getUpdateRoyaltyRateSignatures(passportToken, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateRoyaltyRateTx(passportToken, deployer, params));
}

export async function callPassportToken_Withdraw(
    passportToken: PassportToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: WithdrawParamsInput
) {
    const params: WithdrawParams = {
        ...paramsInput,
        signatures: await getWithdrawSignatures(passportToken, admins, admin, paramsInput),
    };
    await callTransaction(getWithdrawTx(passportToken, deployer, params));
}