import { Admin, PassportToken } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { UpdateBaseURIParamsInput, UpdateFeeParamsInput, UpdateRoyaltyRateParamsInput, WithdrawParamsInput } from "@utils/models/lucra/passportToken";
import { ethers } from "ethers";

export async function getUpdateBaseURISignatures(
    passportToken: PassportToken,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [passportToken.address, "updateBaseURI", paramsInput.uri]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateFeeSignatures(
    passportToken: PassportToken,
    paramsInput: UpdateFeeParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [passportToken.address, "updateFee", paramsInput.fee]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateRoyaltyRateSignatures(
    passportToken: PassportToken,
    paramsInput: UpdateRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [passportToken.address, "updateRoyaltyRate", paramsInput.royaltyRate]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getWithdrawSignatures(
    passportToken: PassportToken,
    paramsInput: WithdrawParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address[]", "uint256[]"],
        [passportToken.address, "withdraw", paramsInput.receiver, paramsInput.currencies, paramsInput.values]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}