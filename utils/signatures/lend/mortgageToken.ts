import { Admin, MortgageToken } from "@typechain-types";
import { UpdateBaseURIParamsInput, UpdateFeeRateParamsInput } from "@utils/models/lend/mortgageToken";
import { getSignatures } from "@utils/blockchain";
import { ethers } from "ethers";

export async function getUpdateBaseURISignatures(
    mortgageToken: MortgageToken,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateBaseURIParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [mortgageToken.address, "updateBaseURI", paramsInput.uri]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateFeeRateSignatures(
    mortgageToken: MortgageToken,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateFeeRateParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [mortgageToken.address, "updateFeeRate", paramsInput.feeRate]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}