import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Admin } from "@typechain-types";
import { PauseParams, UnpauseParams } from "@utils/models/common/pausable";
import { getPauseSignatures, getUnpauseSignatures } from "@utils/signatures/common/pausable";
import { Contract } from "ethers";


// pause
export async function getPauseTx(
    signer: SignerWithAddress,
    pausable: Contract,
    params: PauseParams,
    txConfig = {}
) {
    return await pausable.connect(signer).pause(
        params.signatures,
        txConfig
    );
}

export async function getPauseTxByInput(
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    pausable: Contract,
    txConfig = {}
) {
    const params: PauseParams = {
        signatures: await getPauseSignatures(admins, admin, pausable)
    };
    return await getPauseTx(signer, pausable, params, txConfig);
}


// unpause
export async function getUnpauseTx(
    signer: SignerWithAddress,
    pausable: Contract,
    params: UnpauseParams,
    txConfig = {}
) {
    return await pausable.connect(signer).unpause(
        params.signatures,
        txConfig
    );
}

export async function getUnpauseTxByInput(
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    pausable: Contract,
    txConfig = {}
) {
    const params: UnpauseParams = {
        signatures: await getUnpauseSignatures(admins, admin, pausable)
    };
    return await getUnpauseTx(signer, pausable, params, txConfig);
}