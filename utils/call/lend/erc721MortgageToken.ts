import { Admin, ERC721MortgageToken } from "@typechain-types";
import { callTransaction } from "@utils/blockchain";
import { MockContract } from "@defi-wonderland/smock";
import {
    RegisterCollateralsParams,
    RegisterCollateralsParamsInput
} from "@utils/models/lend/erc721MortgageToken";
import { getRegisterCollateralsSignatures } from "@utils/signatures/lend/erc721MortgageToken";
import { getRegisterCollateralsTx } from "@utils/transaction/lend/erc721MortgageToken";

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
