import { Admin, ERC721MortgageToken } from "@typechain-types";
import { callTransaction } from "../blockchain";
import { MockContract } from "@defi-wonderland/smock";
import {
    RegisterCollateralsParams,
    RegisterCollateralsParamsInput
} from "@utils/models/ERC721MortgageToken";
import { getRegisterCollateralsSignatures } from "@utils/signatures/ERC721MortgageToken";
import { getRegisterCollateralsTx } from "@utils/transaction/ERC721MortgageToken";
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

export async function callERC721MortgageToken_UpdateBaseURI(
    erc721MortgageToken: ERC721MortgageToken | MockContract<ERC721MortgageToken>,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateBaseURIParamsInput,
) {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(erc721MortgageToken as any, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateBaseURITx(erc721MortgageToken as any, deployer, params));
}

export async function callERC721MortgageToken_UpdateFeeRate(
    erc721MortgageToken: ERC721MortgageToken | MockContract<ERC721MortgageToken>,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateFeeRateParamsInput,
) {
    const params: UpdateFeeRateParams = {
        ...paramsInput,
        signatures: await getUpdateFeeRateSignatures(erc721MortgageToken as any, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateFeeRateTx(erc721MortgageToken as any, deployer, params));
}

export async function callERC721MortgageToken_RegisterCollaterals(
    erc721MortgageToken: ERC721MortgageToken | MockContract<ERC721MortgageToken>,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: RegisterCollateralsParamsInput,
) {
    const params: RegisterCollateralsParams = {
        ...paramsInput,
        signatures: await getRegisterCollateralsSignatures(erc721MortgageToken as any, admins, admin, paramsInput),
    };

    await callTransaction(getRegisterCollateralsTx(erc721MortgageToken as any, deployer, params));
}
