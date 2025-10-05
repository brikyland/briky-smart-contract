import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Admin } from "@typechain-types";
import { PauseParams, UnpauseParams } from "@utils/models/common/pausable";
import { getPauseSignatures, getUnpauseSignatures } from "@utils/signatures/common/pausable";
import { Contract } from "ethers";


// pause
export async function getPauseTx(
    pausable: Contract,
    signer: SignerWithAddress,
    params: PauseParams,
    txConfig = {}
) {
    return await pausable.connect(signer).pause(
        params.signatures,
        txConfig
    );
}

export async function getPauseTxByInput(
    pausable: Contract,
    signer: SignerWithAddress,
    admin: Admin,
    admins: any[],
    txConfig = {}
) {
    const params: PauseParams = {
        signatures: await getPauseSignatures(pausable, admin, admins)
    };
    return await getPauseTx(pausable, signer, params, txConfig);
}


// unpause
export async function getUnpauseTx(
    pausable: Contract,
    signer: SignerWithAddress,
    params: UnpauseParams,
    txConfig = {}
) {
    return await pausable.connect(signer).unpause(
        params.signatures,
        txConfig
    );
}

export async function getUnpauseTxByInput(
    pausable: Contract,
    signer: SignerWithAddress,
    admin: Admin,
    admins: any[],
    txConfig = {}
) {
    const params: UnpauseParams = {
        signatures: await getUnpauseSignatures(pausable, admin, admins)
    };
    return await getUnpauseTx(pausable, signer, params, txConfig);
}