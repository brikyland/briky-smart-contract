import {ContractTransaction} from 'ethers';

// @nomiclabs/hardhat-ethers
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import {Admin, EstateForger, ProxyCaller} from '@typechain-types';

// @utils
import {MockValidator} from '@utils/mockValidator';

// @utils/anchor/land
import {getSafeConfirmAnchor, getSafeDepositAnchor} from '@utils/anchor/land/estateForger';

// @utils/models/land
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
    WithdrawEstateTokenParams,
} from '@utils/models/land/estateForger';

// @utils/validation/land
import {
    getRequestTokenizationValidation,
    getUpdateRequestEstateURIValidation,
} from '@utils/validation/land/estateForger';

// @utils/signatures/land
import {getUpdateBaseUnitPriceRangeSignatures, getWhitelistSignatures} from '@utils/signatures/land/estateForger';

// updateBaseUnitPriceRange
export async function getEstateForgerTx_UpdateBaseUnitPriceRange(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: UpdateBaseUnitPriceRangeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger
        .connect(deployer)
        .updateBaseUnitPriceRange(params.baseMinUnitPrice, params.baseMaxUnitPrice, params.signatures, txConfig);
}

export async function getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseUnitPriceRangeParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseUnitPriceRangeParams = {
        ...paramsInput,
        signatures: await getUpdateBaseUnitPriceRangeSignatures(estateForger, paramsInput, admin, admins),
    };
    return await getEstateForgerTx_UpdateBaseUnitPriceRange(estateForger, deployer, params, txConfig);
}

// whitelist
export async function getEstateForgerTx_Whitelist(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: WhitelistParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).whitelist(params.accounts, params.isWhitelisted, params.signatures, txConfig);
}

export async function getEstateForgerTxByInput_Whitelist(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    paramsInput: WhitelistParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: WhitelistParams = {
        ...paramsInput,
        signatures: await getWhitelistSignatures(estateForger, paramsInput, admin, admins),
    };
    return await getEstateForgerTx_Whitelist(estateForger, deployer, params, txConfig);
}

// requestTokenization
export async function getEstateForgerTx_RequestTokenization(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: RequestTokenizationParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger
        .connect(deployer)
        .requestTokenization(
            params.requester,
            params.estate,
            params.quota,
            params.quote,
            params.agenda,
            params.validation,
            txConfig
        );
}

export async function getEstateForgerTxByInput_RequestTokenization(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    paramsInput: RequestTokenizationParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RequestTokenizationParams = {
        ...paramsInput,
        validation: await getRequestTokenizationValidation(estateForger, paramsInput, validator),
    };
    return await getEstateForgerTx_RequestTokenization(estateForger, deployer, params, txConfig);
}

// whitelistFor
export async function getEstateForgerTx_WhitelistFor(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: WhitelistForParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger
        .connect(deployer)
        .whitelistFor(params.requestId, params.accounts, params.isWhitelisted, txConfig);
}

// updateRequestEstateURI
export async function getEstateForgerTx_UpdateRequestEstateURI(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: UpdateRequestEstateURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger
        .connect(deployer)
        .updateRequestEstateURI(params.requestId, params.uri, params.validation, txConfig);
}

export async function getEstateForgerTxByInput_UpdateRequestEstateURI(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    paramsInput: UpdateRequestEstateURIParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateRequestEstateURIParams = {
        ...paramsInput,
        validation: await getUpdateRequestEstateURIValidation(estateForger, paramsInput, validator),
    };
    return getEstateForgerTx_UpdateRequestEstateURI(estateForger, deployer, params, txConfig);
}

// updateRequestAgenda
export async function getEstateForgerTx_UpdateRequestAgenda(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: UpdateRequestAgendaParams
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).updateRequestAgenda(params.requestId, params.agenda);
}

// cancel
export async function getEstateForgerTx_Cancel(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: CancelParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).cancel(params.requestId, txConfig);
}

// deposit
export async function getEstateForgerTx_Deposit(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).deposit(params.requestId, params.quantity, txConfig);
}

export async function getCallEstateForgerTx_Deposit(
    estateForger: EstateForger,
    caller: ProxyCaller,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        estateForger.address,
        estateForger.interface.encodeFunctionData('deposit', [params.requestId, params.quantity]),
        txConfig
    );
}

// safeDeposit
export async function getEstateForgerTx_SafeDeposit(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: SafeDepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).safeDeposit(params.requestId, params.quantity, params.anchor, txConfig);
}

export async function getEstateForgerTxByParams_SafeDeposit(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeDepositParams = {
        ...params,
        anchor: await getSafeDepositAnchor(estateForger, params),
    };
    return await getEstateForgerTx_SafeDeposit(estateForger, deployer, safeParams, txConfig);
}

// confirm
export async function getEstateForgerTx_SafeConfirm(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: SafeConfirmParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).safeConfirm(params.requestId, params.anchor, txConfig);
}

export async function getEstateForgerTxByParams_SafeConfirm(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: ConfirmParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeConfirmParams = {
        ...params,
        anchor: await getSafeConfirmAnchor(estateForger, params),
    };
    return await getEstateForgerTx_SafeConfirm(estateForger, deployer, safeParams, txConfig);
}

// withdrawDeposit
export async function getEstateForgerTx_WithdrawDeposit(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: WithdrawDepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).withdrawDeposit(params.requestId, txConfig);
}

// withdrawEstateToken
export async function getEstateForgerTx_WithdrawEstateToken(
    estateForger: EstateForger,
    deployer: SignerWithAddress,
    params: WithdrawEstateTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateForger.connect(deployer).withdrawEstateToken(params.requestId, txConfig);
}
