import {Admin, EstateForger, ProxyCaller} from "@typechain-types";
import {MockValidator} from "@utils/mockValidator";
import {
    CancelParams,
    ConfirmParams,
    DepositParams,
    RequestTokenizationParams,
    RequestTokenizationParamsInput,
    SafeConfirmParams,
    SafeDepositParams,
    UpdateBaseUnitPriceRangeParams,
    UpdateBaseUnitPriceRangeParamsInput,
    UpdateRequestAgendaParams,
    UpdateRequestEstateURIParams,
    UpdateRequestEstateURIParamsInput,
    WhitelistForParams,
    WhitelistParams,
    WhitelistParamsInput,
    WithdrawDepositParams,
    WithdrawEstateTokenParams
} from "@utils/models/land/estateForger";
import {
    getRequestTokenizationValidation,
    getUpdateRequestEstateURIValidation
} from "@utils/validation/land/estateForger";
import {ContractTransaction, ethers} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {getUpdateBaseUnitPriceRangeSignatures, getWhitelistSignatures} from "@utils/signatures/land/estateForger";
import {getSafeConfirmAnchor, getSafeDepositAnchor} from "@utils/anchor/land/estateForger";


// updateBaseUnitPriceRange
export async function getUpdateBaseUnitPriceRangeTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: UpdateBaseUnitPriceRangeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).updateBaseUnitPriceRange(
        params.baseMinUnitPrice,
        params.baseMaxUnitPrice,
        params.signatures,
        txConfig,
    );
}

export async function getUpdateBaseUnitPriceRangeTxByInput(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseUnitPriceRangeParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseUnitPriceRangeParams = {
        ...paramsInput,
        signatures: await getUpdateBaseUnitPriceRangeSignatures(estateForger, paramsInput, admin, admins)
    }
    return await getUpdateBaseUnitPriceRangeTx(estateForger, deployer, params, txConfig);
}


// whitelist
export async function getWhitelistTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: WhitelistParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).whitelist(
        params.accounts,
        params.isWhitelisted,
        params.signatures,
        txConfig,
    );
}

export async function getWhitelistTxByInput(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    paramsInput: WhitelistParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: WhitelistParams = {
        ...paramsInput,
        signatures: await getWhitelistSignatures(estateForger, paramsInput, admin, admins)
    }
    return await getWhitelistTx(estateForger, deployer, params, txConfig);
}


// requestTokenization
export async function getRequestTokenizationTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: RequestTokenizationParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).requestTokenization(
        params.requester,
        params.estate,
        params.quota,
        params.quote,
        params.agenda,
        params.validation,
        txConfig,
    );
}

export async function getRequestTokenizationTxByInput(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    paramsInput: RequestTokenizationParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RequestTokenizationParams = {
        ...paramsInput,
        validation: await getRequestTokenizationValidation(estateForger, paramsInput, validator)
    }
    return await getRequestTokenizationTx(estateForger, deployer, params, txConfig);
}


// whitelistFor
export async function getWhitelistForTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: WhitelistForParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).whitelistFor(
        params.requestId,
        params.accounts,
        params.isWhitelisted,
        txConfig,
    );
}


// updateRequestEstateURI
export async function getUpdateRequestEstateURITx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: UpdateRequestEstateURIParams,
    txConfig = {},
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).updateRequestEstateURI(
        params.requestId,
        params.uri,
        params.validation,
        txConfig,
    );
}

export async function getUpdateRequestEstateURITxByInput(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    paramsInput: UpdateRequestEstateURIParamsInput,
    validator: MockValidator,
    txConfig = {},
): Promise<ContractTransaction> {
    const params: UpdateRequestEstateURIParams = {
        ...paramsInput,
        validation: await getUpdateRequestEstateURIValidation(estateForger, paramsInput, validator)
    }
    return getUpdateRequestEstateURITx(estateForger, deployer, params, txConfig);
}


// updateRequestAgenda
export async function getUpdateRequestAgendaTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: UpdateRequestAgendaParams
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).updateRequestAgenda(
        params.requestId,
        params.agenda,
    );
}


// cancel
export async function getCancelTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: CancelParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).cancel(
        params.requestId,
        txConfig,
    )
}


// deposit
export async function getDepositTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).deposit(
        params.requestId,
        params.quantity,
        txConfig,
    );
}

export async function getCallDepositTx(
    estateForger: EstateForger,
    caller: ProxyCaller,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        estateForger.address,
        estateForger.interface.encodeFunctionData('deposit', [
            params.requestId,
            params.quantity
        ]),
        txConfig,
    );
}


// safeDeposit
export async function getSafeDepositTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: SafeDepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = estateForger.connect(deployer).safeDeposit(
        params.requestId,
        params.quantity,
        params.anchor,
        txConfig,
    );
    return tx;
}

export async function getSafeDepositTxByParams(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeDepositParams = {
        ...params,
        anchor: await getSafeDepositAnchor(estateForger, params),
    };
    return await getSafeDepositTx(estateForger, deployer, safeParams, txConfig);
}


// confirm
export async function getSafeConfirmTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: SafeConfirmParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).safeConfirm(
        params.requestId,
        params.anchor,
        txConfig,
    );
}

export async function getSafeConfirmTxByParams(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: ConfirmParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeConfirmParams = {
        ...params,
        anchor: await getSafeConfirmAnchor(estateForger, params),
    };
    return await getSafeConfirmTx(estateForger, deployer, safeParams, txConfig);
}


// withdrawDeposit
export async function getWithdrawDepositTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: WithdrawDepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).withdrawDeposit(
        params.requestId,
        txConfig
    );
}


// withdrawEstateToken
export async function getWithdrawEstateTokenTx(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: WithdrawEstateTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).withdrawEstateToken(
        params.requestId,
        txConfig
    );
}