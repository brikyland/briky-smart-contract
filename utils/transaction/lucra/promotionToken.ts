import { Admin, PromotionToken } from "@typechain-types";
import {
    UpdateFeeParams,
    UpdateRoyaltyRateParams,
    WithdrawParams,
    CreateContentsParams,
    UpdateContentURIsParams,
    CancelContentsParams,
    UpdateFeeParamsInput,
    UpdateRoyaltyRateParamsInput,
    WithdrawParamsInput,
    CreateContentsParamsInput,
    UpdateContentURIsParamsInput,
    CancelContentsParamsInput,
    MintParams
} from "@utils/models/lucra/promotionToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getCancelContentsSignatures, getCreateContentsSignatures, getUpdateContentURIsSignatures, getUpdateFeeSignatures, getUpdateRoyaltyRateSignatures, getWithdrawSignatures } from "@utils/signatures/lucra/promotionToken";


// updateFee
export async function getUpdateFeeTx(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: UpdateFeeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).updateFee(
        params.fee,
        params.signatures,
        txConfig
    );
}

export async function getUpdateFeeTxByInput(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateFeeParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateFeeParams = {
        ...paramsInput,
        signatures: await getUpdateFeeSignatures(promotionToken, paramsInput, admin, admins),
    };
    return getUpdateFeeTx(promotionToken, deployer, params, txConfig);
}


// updateRoyaltyRate
export async function getUpdateRoyaltyRateTx(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: UpdateRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).updateRoyaltyRate(
        params.royaltyRate,
        params.signatures,
        txConfig
    );
}

export async function getUpdateRoyaltyRateTxByInput(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateRoyaltyRateParams = {
        ...paramsInput,
        signatures: await getUpdateRoyaltyRateSignatures(promotionToken, paramsInput, admin, admins),
    };
    return getUpdateRoyaltyRateTx(promotionToken, deployer, params, txConfig);
}


// withdraw
export async function getWithdrawTx(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).withdraw(
        params.receiver,
        params.currencies,
        params.values,
        params.signatures,
        txConfig
    );
}

export async function getWithdrawTxByInput(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    paramsInput: WithdrawParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: WithdrawParams = {
        ...paramsInput,
        signatures: await getWithdrawSignatures(promotionToken, paramsInput, admin, admins),
    };
    return getWithdrawTx(promotionToken, deployer, params, txConfig);
}


// createContents
export async function getCreateContentsTx(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: CreateContentsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).createContents(
        params.uris,
        params.startAts,
        params.durations,
        params.signatures,
        txConfig
    );
}

export async function getCreateContentsTxByInput(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    paramsInput: CreateContentsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: CreateContentsParams = {
        ...paramsInput,
        signatures: await getCreateContentsSignatures(promotionToken, paramsInput, admin, admins),
    };
    return getCreateContentsTx(promotionToken, deployer, params, txConfig);
}


// updateContentURIs
export async function getUpdateContentURIsTx(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: UpdateContentURIsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).updateContentURIs(
        params.contentIds,
        params.uris,
        params.signatures,
        txConfig
    );
}

export async function getUpdateContentURIsTxByInput(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateContentURIsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateContentURIsParams = {
        ...paramsInput,
        signatures: await getUpdateContentURIsSignatures(promotionToken, paramsInput, admin, admins),
    };
    return getUpdateContentURIsTx(promotionToken, deployer, params, txConfig);
}


// cancelContents
export async function getCancelContentsTx(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: CancelContentsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).cancelContents(
        params.contentIds,
        params.signatures,
        txConfig
    );
}

export async function getCancelContentsTxByInput(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    paramsInput: CancelContentsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: CancelContentsParams = {
        ...paramsInput,
        signatures: await getCancelContentsSignatures(promotionToken, paramsInput, admin, admins),
    };
    return getCancelContentsTx(promotionToken, deployer, params, txConfig);
}


// mint
export async function getMintTx(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: MintParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).mint(
        params.contentId,
        params.amount,
        txConfig
    );
}