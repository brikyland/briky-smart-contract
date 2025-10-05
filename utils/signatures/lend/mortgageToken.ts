import { Admin, MortgageToken } from "@typechain-types";
import { UpdateBaseURIParamsInput, UpdateFeeRateParamsInput } from "@utils/models/lend/mortgageToken";
import { getSignatures } from "@utils/blockchain";
import { ethers } from "ethers";


// updateBaseURI
export async function getUpdateBaseURISignatures(
    mortgageToken: MortgageToken,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [mortgageToken.address, "updateBaseURI", paramsInput.uri]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// updateFeeRate
export async function getUpdateFeeRateSignatures(
    mortgageToken: MortgageToken,
    paramsInput: UpdateFeeRateParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [mortgageToken.address, "updateFeeRate", paramsInput.feeRate]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}