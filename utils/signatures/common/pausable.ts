import { Contract, ethers } from 'ethers';

// @typechain-types
import { Admin } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// pause
export async function getPauseSignatures(pausable: Contract, admin: Admin, admins: any[], isValid: boolean = true) {
    let message = ethers.utils.defaultAbiCoder.encode(['address', 'string'], [pausable.address, 'pause']);
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// unpause
export async function getUnpauseSignatures(pausable: Contract, admin: Admin, admins: any[], isValid: boolean = true) {
    let message = ethers.utils.defaultAbiCoder.encode(['address', 'string'], [pausable.address, 'unpause']);
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
