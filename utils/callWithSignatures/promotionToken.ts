import { Admin, PromotionToken } from "../../typechain-types";
import {
    CancelContentsParams,
    CancelContentsParamsInput,
    CreateContentsParams,
    CreateContentsParamsInput,
} from "@utils/models/PromotionToken";
import { callTransaction } from "../blockchain";
import {
    getCancelContentsSignatures,
    getCreateContentsSignatures
} from "@utils/signatures/PromotionToken";
import { 
    getCancelContentsTx,
    getCreateContentsTx,
} from "@utils/transaction/PromotionToken";

export async function callPromotionToken_CreateContents(
    promotionToken: PromotionToken,
    deployer: any,
    admin: Admin,
    admins: any[],
    paramsInput: CreateContentsParamsInput,
) {
    const params: CreateContentsParams = {
        ...paramsInput,
        signatures: await getCreateContentsSignatures(promotionToken, admins, admin, paramsInput),
    };

    await callTransaction(getCreateContentsTx(promotionToken, deployer, params));
}

export async function callPromotionToken_CancelContents(
    promotionToken: PromotionToken,
    deployer: any,
    admin: Admin,
    admins: any[],
    paramsInput: CancelContentsParamsInput,
) {
    const params: CancelContentsParams = {
        ...paramsInput,
        signatures: await getCancelContentsSignatures(promotionToken, admins, admin, paramsInput),
    };

    await callTransaction(getCancelContentsTx(promotionToken, deployer, params));
}
