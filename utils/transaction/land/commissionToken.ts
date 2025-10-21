import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, CommissionToken, ProxyCaller } from '@typechain-types';

// @utils/models/land
import {
    ActivateBrokerParams,
    MintParams,
    RegisterBrokerParams,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateRoyaltyRateParams,
    UpdateRoyaltyRateParamsInput,
} from '@utils/models/land/commissionToken';

// @utils/signatures/land
import { getUpdateBaseURISignatures, getUpdateRoyaltyRateSignatures } from '@utils/signatures/land/commissionToken';

// updateBaseURI
export async function getCommissionTokenTx_UpdateBaseURI(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).updateBaseURI(params.uri, params.signatures, txConfig);
}

export async function getCommissionTokenTxByInput_UpdateBaseURI(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(commissionToken, paramsInput, admin, admins),
    };

    return await getCommissionTokenTx_UpdateBaseURI(commissionToken, deployer, params, txConfig);
}

// updateRoyaltyRate
export async function getCommissionTokenTx_UpdateRoyaltyRate(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: UpdateRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).updateRoyaltyRate(params.royaltyRate, params.signatures, txConfig);
}

export async function getCommissionTokenTxByInput_UpdateRoyaltyRate(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateRoyaltyRateParams = {
        ...paramsInput,
        signatures: await getUpdateRoyaltyRateSignatures(commissionToken, paramsInput, admin, admins),
    };

    return await getCommissionTokenTx_UpdateRoyaltyRate(commissionToken, deployer, params, txConfig);
}

// registerBroker
export async function getCommissionTokenTx_RegisterBroker(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: RegisterBrokerParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken
        .connect(deployer)
        .registerBroker(params.zone, params.broker, params.commissionRate, txConfig);
}

// activateBroker
export async function getCommissionTokenTx_ActivateBroker(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: ActivateBrokerParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).activateBroker(params.zone, params.broker, params.isActive, txConfig);
}

// mint
export async function getCommissionTokenTx_Mint(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: MintParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).mint(params.zone, params.broker, params.tokenId, txConfig);
}

export async function getCallCommissionTokenTx_Mint(
    commissionToken: CommissionToken,
    caller: ProxyCaller,
    params: MintParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        commissionToken.address,
        commissionToken.interface.encodeFunctionData('mint', [params.zone, params.broker, params.tokenId]),
        txConfig
    );
}
