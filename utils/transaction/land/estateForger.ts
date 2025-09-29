import { EstateForger, MockEstateForger } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { ConfirmParams, DepositParams, RequestTokenizationParams, SafeConfirmParams, SafeDepositParams, UpdateRequestAgendaParams, UpdateRequestEstateURIParams } from "@utils/models/land/estateForger";
import { getRequestTokenizationValidation, getUpdateRequestEstateURIValidation } from "@utils/validation/EstateForger";
import { ContractTransaction, ethers } from "ethers";

export async function getRequestTokenizationTx(
    estateForger: EstateForger | MockEstateForger,
    validator: MockValidator,
    deployer: any,
    params: RequestTokenizationParams
): Promise<ContractTransaction> {
    const validation = await getRequestTokenizationValidation(
        estateForger,
        validator,
        params
    );
    const tx = estateForger.connect(deployer).requestTokenization(
        params.requester,
        params.estate,
        params.quota,
        params.quote,
        params.agenda,
        validation,
    );

    return tx;
}

export async function getUpdateRequestEstateURITx(
    estateForger: EstateForger | MockEstateForger,
    validator: MockValidator,
    deployer: any,
    params: UpdateRequestEstateURIParams
): Promise<ContractTransaction> {
    const validation = await getUpdateRequestEstateURIValidation(
        estateForger,
        validator,
        params,
    );
    const tx = estateForger.connect(deployer).updateRequestEstateURI(
        params.requestId,
        params.uri,
        validation,
    );

    return tx;
}

export async function getUpdateRequestAgendaTx(
    estateForger: EstateForger | MockEstateForger,
    deployer: any,
    params: UpdateRequestAgendaParams
): Promise<ContractTransaction> {
    const tx = estateForger.connect(deployer).updateRequestAgenda(
        params.requestId,
        params.agenda,
    );
    return tx;
}

export async function getDepositTx(
    estateForger: EstateForger | MockEstateForger,
    deployer: any,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = estateForger.connect(deployer).deposit(
        params.requestId,
        params.quantity,
        txConfig,
    );
    return tx;
}

export async function getSafeDepositTx(
    estateForger: EstateForger | MockEstateForger,
    deployer: any,
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
    estateForger: EstateForger | MockEstateForger,
    deployer: any,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const currentURI = (await estateForger.getRequest(params.requestId)).estate.uri;
    const safeParams: SafeDepositParams = {
        requestId: params.requestId,
        quantity: params.quantity,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getSafeDepositTx(estateForger, deployer, safeParams, txConfig);
}

export async function getSafeConfirmTx(
    estateForger: EstateForger | MockEstateForger,
    deployer: any,
    params: SafeConfirmParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = estateForger.connect(deployer).safeConfirm(
        params.requestId,
        params.anchor,
        txConfig,
    );
    return tx;
}

export async function getSafeConfirmTxByParams(
    estateForger: EstateForger | MockEstateForger,
    deployer: any,
    params: ConfirmParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const currentURI = (await estateForger.getRequest(params.requestId)).estate.uri;
    const safeParams: SafeConfirmParams = {
        requestId: params.requestId,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getSafeConfirmTx(estateForger, deployer, safeParams, txConfig);
}
