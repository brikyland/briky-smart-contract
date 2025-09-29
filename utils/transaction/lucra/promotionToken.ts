import { PromotionToken } from "@typechain-types";
import {
    UpdateFeeParams,
    UpdateRoyaltyRateParams,
    WithdrawParams,
    CreateContentsParams,
    UpdateContentURIsParams,
    CancelContentsParams
} from "@utils/models/lucra/promotionToken";

export async function getUpdateFeeTx(
    promotionToken: PromotionToken,
    deployer: any,
    params: UpdateFeeParams,
    txConfig = {}
) {
    return await promotionToken.connect(deployer).updateFee(
        params.fee,
        params.signatures,
        txConfig
    );
}

export async function getUpdateRoyaltyRateTx(
    promotionToken: PromotionToken,
    deployer: any,
    params: UpdateRoyaltyRateParams,
    txConfig = {}
) {
    return await promotionToken.connect(deployer).updateRoyaltyRate(
        params.royaltyRate,
        params.signatures,
        txConfig
    );
}

export async function getWithdrawTx(
    promotionToken: PromotionToken,
    deployer: any,
    params: WithdrawParams,
    txConfig = {}
) {
    return await promotionToken.connect(deployer).withdraw(
        params.receiver,
        params.currencies,
        params.values,
        params.signatures,
        txConfig
    );
}

export async function getCreateContentsTx(
    promotionToken: PromotionToken,
    deployer: any,
    params: CreateContentsParams,
    txConfig = {}
) {
    return await promotionToken.connect(deployer).createContents(
        params.uris,
        params.startAts,
        params.durations,
        params.signatures,
        txConfig
    );
}

export async function getUpdateContentURIsTx(
    promotionToken: PromotionToken,
    deployer: any,
    params: UpdateContentURIsParams,
    txConfig = {}
) {
    return await promotionToken.connect(deployer).updateContentURIs(
        params.contentIds,
        params.uris,
        params.signatures,
        txConfig
    );
}

export async function getCancelContentsTx(
    promotionToken: PromotionToken,
    deployer: any,
    params: CancelContentsParams,
    txConfig = {}
) {
    return await promotionToken.connect(deployer).cancelContents(
        params.contentIds,
        params.signatures,
        txConfig
    );
}