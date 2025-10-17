import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, PromotionToken } from '@typechain-types';

// @utils/models/lucra
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
    MintParams,
} from '@utils/models/lucra/promotionToken';

// @utils/signatures/lucra
import {
    getCancelContentsSignatures,
    getCreateContentsSignatures,
    getUpdateContentURIsSignatures,
    getUpdateFeeSignatures,
    getUpdateRoyaltyRateSignatures,
    getWithdrawSignatures,
} from '@utils/signatures/lucra/promotionToken';

// updateFee
export async function getPromotionTokenTx_UpdateFee(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: UpdateFeeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).updateFee(params.fee, params.signatures, txConfig);
}

export async function getPromotionTokenTxByInput_UpdateFee(
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
    return getPromotionTokenTx_UpdateFee(promotionToken, deployer, params, txConfig);
}

// updateRoyaltyRate
export async function getPromotionTokenTx_UpdateRoyaltyRate(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: UpdateRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).updateRoyaltyRate(params.royaltyRate, params.signatures, txConfig);
}

export async function getPromotionTokenTxByInput_UpdateRoyaltyRate(
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
    return getPromotionTokenTx_UpdateRoyaltyRate(promotionToken, deployer, params, txConfig);
}

// withdraw
export async function getPromotionTokenTx_Withdraw(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken
        .connect(deployer)
        .withdraw(params.receiver, params.currencies, params.values, params.signatures, txConfig);
}

export async function getPromotionTokenTxByInput_Withdraw(
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
    return getPromotionTokenTx_Withdraw(promotionToken, deployer, params, txConfig);
}

// createContents
export async function getPromotionTokenTx_CreateContents(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: CreateContentsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken
        .connect(deployer)
        .createContents(params.uris, params.startAts, params.durations, params.signatures, txConfig);
}

export async function getPromotionTokenTxByInput_CreateContents(
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
    return getPromotionTokenTx_CreateContents(promotionToken, deployer, params, txConfig);
}

// updateContentURIs
export async function getPromotionTokenTx_UpdateContentURIs(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: UpdateContentURIsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken
        .connect(deployer)
        .updateContentURIs(params.contentIds, params.uris, params.signatures, txConfig);
}

export async function getPromotionTokenTxByInput_UpdateContentURIs(
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
    return getPromotionTokenTx_UpdateContentURIs(promotionToken, deployer, params, txConfig);
}

// cancelContents
export async function getPromotionTokenTx_CancelContents(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: CancelContentsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).cancelContents(params.contentIds, params.signatures, txConfig);
}

export async function getPromotionTokenTxByInput_CancelContents(
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
    return getPromotionTokenTx_CancelContents(promotionToken, deployer, params, txConfig);
}

// mint
export async function getPromotionTokenTx_Mint(
    promotionToken: PromotionToken,
    deployer: SignerWithAddress,
    params: MintParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return promotionToken.connect(deployer).mint(params.contentId, params.amount, txConfig);
}
