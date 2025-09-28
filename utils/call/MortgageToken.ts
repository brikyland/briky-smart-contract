import { Admin, MortgageToken } from "@typechain-types";
import { callTransaction } from "@utils/blockchain";
import {
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeRateParams,
    UpdateFeeRateParamsInput
} from "@utils/models/MortgageToken";
import {
    getUpdateBaseURISignatures,
    getUpdateFeeRateSignatures
} from "@utils/signatures/MortgageToken";
import {
    getUpdateBaseURITx,
    getUpdateFeeRateTx
} from "@utils/transaction/MortgageToken";

export async function callMortgageToken_UpdateBaseURI(
    mortgageToken: MortgageToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateBaseURIParamsInput,
) {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(mortgageToken as any, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateBaseURITx(mortgageToken as any, deployer, params));
}

export async function callMortgageToken_UpdateFeeRate(
    mortgageToken: MortgageToken,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateFeeRateParamsInput,
) {
    const params: UpdateFeeRateParams = {
        ...paramsInput,
        signatures: await getUpdateFeeRateSignatures(mortgageToken as any, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateFeeRateTx(mortgageToken as any, deployer, params));
}
