import { Admin, PromotionToken } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { 
    UpdateFeeParamsInput,
    UpdateRoyaltyRateParamsInput,
    WithdrawParamsInput,
    CreateContentsParamsInput,
    UpdateContentURIsParamsInput,
    CancelContentsParamsInput
} from "@utils/models/lucra/promotionToken";
import { ethers } from "ethers";

export async function getUpdateFeeSignatures(
    promotionToken: PromotionToken,
    paramsInput: UpdateFeeParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [promotionToken.address, "updateFee", paramsInput.fee]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateRoyaltyRateSignatures(
    promotionToken: PromotionToken,
    paramsInput: UpdateRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [promotionToken.address, "updateRoyaltyRate", paramsInput.royaltyRate]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getWithdrawSignatures(
    promotionToken: PromotionToken,
    paramsInput: WithdrawParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address", "address[]", "uint256[]"],
        [promotionToken.address, "withdraw", paramsInput.receiver, paramsInput.currencies, paramsInput.values]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getCreateContentsSignatures(
    promotionToken: PromotionToken,
    paramsInput: CreateContentsParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string[]", "uint40[]", "uint40[]"],
        [promotionToken.address, "createContents", paramsInput.uris, paramsInput.startAts, paramsInput.durations]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateContentURIsSignatures(
    promotionToken: PromotionToken,
    paramsInput: UpdateContentURIsParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256[]", "string[]"],
        [promotionToken.address, "updateContentURIs", paramsInput.contentIds, paramsInput.uris]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getCancelContentsSignatures(
    promotionToken: PromotionToken,
    paramsInput: CancelContentsParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256[]"],
        [promotionToken.address, "cancelContents", paramsInput.contentIds]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}