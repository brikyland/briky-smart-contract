import { Admin, ERC721MortgageToken } from "@typechain-types";
import { RegisterCollateralsParamsInput } from "@utils/models/lend/erc721MortgageToken";
import { ethers } from "ethers";
import { getSignatures } from "@utils/blockchain";

export async function getRegisterCollateralsSignatures(
    erc721MortgageToken: ERC721MortgageToken,
    admins: any[],
    admin: Admin,
    params: RegisterCollateralsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [erc721MortgageToken.address, "registerCollaterals", params.tokens, params.isCollateral]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}