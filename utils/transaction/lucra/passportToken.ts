import { Admin, PassportToken } from "@typechain-types";
import {
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeParams,
    UpdateFeeParamsInput,
    UpdateRoyaltyRateParams,
    UpdateRoyaltyRateParamsInput,
    WithdrawParams,
    WithdrawParamsInput
} from "@utils/models/lucra/passportToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getUpdateBaseURISignatures, getUpdateFeeSignatures, getUpdateRoyaltyRateSignatures, getWithdrawSignatures } from "@utils/signatures/lucra/passportToken";


// updateBaseURI
export async function getUpdateBaseURITx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).updateBaseURI(
        params.uri,
        params.signatures,
        txConfig
    );
}

export async function getUpdateBaseURITxByInput(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(passportToken, paramsInput, admin, admins),
    };
    return getUpdateBaseURITx(passportToken, deployer, params, txConfig);
}


// updateFee
export async function getUpdateFeeTx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateFeeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).updateFee(
        params.fee,
        params.signatures,
        txConfig
    );
}

export async function getUpdateFeeTxByInput(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateFeeParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateFeeParams = {
        ...paramsInput,
        signatures: await getUpdateFeeSignatures(passportToken, paramsInput, admin, admins),
    };
    return getUpdateFeeTx(passportToken, deployer, params, txConfig);
}


// updateRoyaltyRate
export async function getUpdateRoyaltyRateTx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).updateRoyaltyRate(
        params.royaltyRate,
        params.signatures,
        txConfig
    );
}

export async function getUpdateRoyaltyRateTxByInput(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateRoyaltyRateParams = {
        ...paramsInput,
        signatures: await getUpdateRoyaltyRateSignatures(passportToken, paramsInput, admin, admins),
    };
    return getUpdateRoyaltyRateTx(passportToken, deployer, params, txConfig);
}


// withdraw
export async function getWithdrawTx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).withdraw(
        params.receiver,
        params.currencies,
        params.values,
        params.signatures,
        txConfig
    );
}

export async function getWithdrawTxByInput(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    paramsInput: WithdrawParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: WithdrawParams = {
        ...paramsInput,
        signatures: await getWithdrawSignatures(passportToken, paramsInput, admin, admins),
    };
    return getWithdrawTx(passportToken, deployer, params, txConfig);
}


// mint
export async function getMintTx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).mint(txConfig);
}