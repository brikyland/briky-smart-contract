import { Admin, PassportToken } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { UpdateBaseURIParamsInput, UpdateFeeParamsInput, UpdateRoyaltyRateParamsInput, WithdrawParamsInput } from "@utils/models/lucra/passportToken";
import { ethers } from "ethers";

export async function getUpdateBaseURISignatures(
    passportToken: PassportToken,
    admins: any[],
    admin: Admin,
    params: UpdateBaseURIParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [passportToken.address, "updateBaseURI", params.uri]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateFeeSignatures(
    passportToken: PassportToken,
    admins: any[],
    admin: Admin,
    params: UpdateFeeParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [passportToken.address, "updateFee", params.fee]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateRoyaltyRateSignatures(
    passportToken: PassportToken,
    admins: any[],
    admin: Admin,
    params: UpdateRoyaltyRateParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [passportToken.address, "updateRoyaltyRate", params.royaltyRate]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getWithdrawSignatures(
    passportToken: PassportToken,
    admins: any[],
    admin: Admin,
    params: WithdrawParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address[]", "uint256[]"],
        [passportToken.address, "withdraw", params.receiver, params.currencies, params.values]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}