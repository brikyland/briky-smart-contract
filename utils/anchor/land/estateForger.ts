import { ethers } from "ethers";

import {EstateForger} from "@typechain-types";

import {
    ConfirmParams,
    DepositParams
} from "@utils/models/land/estateForger";


// safeDeposit
export async function getSafeDepositAnchor(
    estateForger: EstateForger,
    params: DepositParams
): Promise<string> {
    const currentURI = (await estateForger.getRequest(params.requestId)).estate.uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}


// safeConfirm
export async function getSafeConfirmAnchor(
    estateForger: EstateForger,
    params: ConfirmParams
): Promise<string> {
    const currentURI = (await estateForger.getRequest(params.requestId)).estate.uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}
