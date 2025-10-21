import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, PassportToken } from '@typechain-types';

// @utils/models/lucra
import {
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeParams,
    UpdateFeeParamsInput,
    UpdateRoyaltyRateParams,
    UpdateRoyaltyRateParamsInput,
    WithdrawParams,
    WithdrawParamsInput,
} from '@utils/models/lucra/passportToken';

// @utils/signatures/lucra
import {
    getUpdateBaseURISignatures,
    getUpdateFeeSignatures,
    getUpdateRoyaltyRateSignatures,
    getWithdrawSignatures,
} from '@utils/signatures/lucra/passportToken';

// updateBaseURI
export async function getPassportTokenTx_UpdateBaseURI(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).updateBaseURI(params.uri, params.signatures, txConfig);
}

export async function getPassportTokenTxByInput_UpdateBaseURI(
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
    return getPassportTokenTx_UpdateBaseURI(passportToken, deployer, params, txConfig);
}

// updateFee
export async function getPassportTokenTx_UpdateFee(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateFeeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).updateFee(params.fee, params.signatures, txConfig);
}

export async function getPassportTokenTxByInput_UpdateFee(
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
    return getPassportTokenTx_UpdateFee(passportToken, deployer, params, txConfig);
}

// updateRoyaltyRate
export async function getPassportTokenTx_UpdateRoyaltyRate(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).updateRoyaltyRate(params.royaltyRate, params.signatures, txConfig);
}

export async function getPassportTokenTxByInput_UpdateRoyaltyRate(
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
    return getPassportTokenTx_UpdateRoyaltyRate(passportToken, deployer, params, txConfig);
}

// withdraw
export async function getPassportTokenTx_Withdraw(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken
        .connect(deployer)
        .withdraw(params.receiver, params.currencies, params.values, params.signatures, txConfig);
}

export async function getPassportTokenTxByInput_Withdraw(
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
    return getPassportTokenTx_Withdraw(passportToken, deployer, params, txConfig);
}

// mint
export async function getPassportTokenTx_Mint(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    txConfig = {}
): Promise<ContractTransaction> {
    return passportToken.connect(deployer).mint(txConfig);
}
