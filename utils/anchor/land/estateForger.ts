import { ethers } from 'ethers';

// @typechain-types
import { EstateForger } from '@typechain-types';

// @utils/models/land
import { ConfirmParams, DepositParams } from '@utils/models/land/estateForger';

// safeDeposit
export async function getSafeDepositAnchor(estateForger: EstateForger, params: DepositParams): Promise<string> {
    const currentURI = (await estateForger.getRequest(params.requestId)).estate.uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

// safeConfirm
export async function getSafeConfirmAnchor(estateForger: EstateForger, params: ConfirmParams): Promise<string> {
    const currentURI = (await estateForger.getRequest(params.requestId)).estate.uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}
