import { Admin, PromotionToken } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { 
    UpdateFeeParamsInput,
    UpdateRoyaltyRateParamsInput,
    WithdrawParamsInput,
    CreateContentsParamsInput,
    UpdateContentURIsParamsInput,
    CancelContentsParamsInput
} from "@utils/models/PromotionToken";
import { ethers } from "ethers";

export async function getUpdateFeeSignatures(
    promotionToken: PromotionToken,
    admins: any[],
    admin: Admin,
    params: UpdateFeeParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [promotionToken.address, "updateFee", params.fee]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateRoyaltyRateSignatures(
    promotionToken: PromotionToken,
    admins: any[],
    admin: Admin,
    params: UpdateRoyaltyRateParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [promotionToken.address, "updateRoyaltyRate", params.royaltyRate]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getWithdrawSignatures(
    promotionToken: PromotionToken,
    admins: any[],
    admin: Admin,
    params: WithdrawParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address[]", "uint256[]"],
        [promotionToken.address, "withdraw", params.receiver, params.currencies, params.values]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getCreateContentsSignatures(
    promotionToken: PromotionToken,
    admins: any[],
    admin: Admin,
    params: CreateContentsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string[]", "uint40[]", "uint40[]"],
        [promotionToken.address, "createContents", params.uris, params.startAts, params.durations]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateContentURIsSignatures(
    promotionToken: PromotionToken,
    admins: any[],
    admin: Admin,
    params: UpdateContentURIsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256[]", "string[]"],
        [promotionToken.address, "updateContentURIs", params.contentIds, params.uris]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getCancelContentsSignatures(
    promotionToken: PromotionToken,
    admins: any[],
    admin: Admin,
    params: CancelContentsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256[]"],
        [promotionToken.address, "cancelContents", params.contentIds]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}