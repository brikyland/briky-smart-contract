import { Contract, ContractTransaction } from 'ethers';

// @typechain-types
import { Admin } from '@typechain-types';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @utils/models/common
import { PauseParams, UnpauseParams } from '@utils/models/common/pausable';

// @utils/signatures/common
import { getPauseSignatures, getUnpauseSignatures } from '@utils/signatures/common/pausable';

// pause
export async function getPausableTx_Pause(
    pausable: Contract,
    signer: SignerWithAddress,
    params: PauseParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await pausable.connect(signer).pause(params.signatures, txConfig);
}

export async function getPausableTxByInput_Pause(
    pausable: Contract,
    signer: SignerWithAddress,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: PauseParams = {
        signatures: await getPauseSignatures(pausable, admin, admins),
    };
    return await getPausableTx_Pause(pausable, signer, params, txConfig);
}

// unpause
export async function getPausableTx_Unpause(
    pausable: Contract,
    signer: SignerWithAddress,
    params: UnpauseParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await pausable.connect(signer).unpause(params.signatures, txConfig);
}

export async function getPausableTxByInput_Unpause(
    pausable: Contract,
    signer: SignerWithAddress,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UnpauseParams = {
        signatures: await getUnpauseSignatures(pausable, admin, admins),
    };
    return await getPausableTx_Unpause(pausable, signer, params, txConfig);
}
