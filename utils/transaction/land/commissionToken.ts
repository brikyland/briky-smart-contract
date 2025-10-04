import { Admin, CommissionToken, ProxyCaller } from "@typechain-types";
import { ActivateBrokerParams, MintParams, RegisterBrokerParams, UpdateBaseURIParams, UpdateBaseURIParamsInput, UpdateRoyaltyRateParams, UpdateRoyaltyRateParamsInput } from "@utils/models/land/commissionToken";
import { ContractTransaction } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getUpdateBaseURISignatures, getUpdateRoyaltyRateSignatures } from "@utils/signatures/land/commissionToken";


// updateBaseURI
export async function getUpdateBaseURITx(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).updateBaseURI(
        params.uri,
        params.signatures,
        txConfig
    );
}

export async function getUpdateBaseURITxByInput(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseURIParamsInput,
    admins: any[],
    admin: Admin,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(commissionToken, paramsInput, admins, admin),
    };
    
    return await getUpdateBaseURITx(commissionToken, deployer, params, txConfig);
}


// updateRoyaltyRate
export async function getUpdateRoyaltyRateTx(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: UpdateRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).updateRoyaltyRate(
        params.royaltyRate,
        params.signatures,
        txConfig
    );
}

export async function getUpdateRoyaltyRateTxByInput(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateRoyaltyRateParamsInput,
    admins: any[],
    admin: Admin,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateRoyaltyRateParams = {
        ...paramsInput,
        signatures: await getUpdateRoyaltyRateSignatures(commissionToken, paramsInput, admins, admin),
    };

    return await getUpdateRoyaltyRateTx(commissionToken, deployer, params, txConfig);
}


// registerBroker
export async function getRegisterBrokerTx(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: RegisterBrokerParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).registerBroker(
        params.zone,
        params.broker,
        params.commissionRate,
        txConfig
    );
}


// activateBroker
export async function getActivateBrokerTx(
    commissionToken: CommissionToken,
    deployer: SignerWithAddress,
    params: ActivateBrokerParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).activateBroker(
        params.zone,
        params.broker,
        params.isActive,
        txConfig
    );
}


// mint
export async function getCallMintTx(
    commissionToken: CommissionToken,
    caller: ProxyCaller,
    params: MintParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        commissionToken.address,
        commissionToken.interface.encodeFunctionData('mint', [
            params.zone,
            params.broker,
            params.tokenId,
        ]),
        txConfig
    );
}
