import { Admin, CommissionToken } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { UpdateBaseURIParamsInput, UpdateRoyaltyRateParamsInput } from "@utils/models/land/commissionToken";
import { ethers } from "ethers";


// updateBaseURI
export async function getUpdateBaseURISignatures(
    commissionToken: CommissionToken,
    paramsInput: UpdateBaseURIParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [commissionToken.address, "updateBaseURI", paramsInput.uri]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// updateRoyaltyRate
export async function getUpdateRoyaltyRateSignatures(
    commissionToken: CommissionToken,
    paramsInput: UpdateRoyaltyRateParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [commissionToken.address, "updateRoyaltyRate", paramsInput.royaltyRate]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}