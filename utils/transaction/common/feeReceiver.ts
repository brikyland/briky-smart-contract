import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Admin, FeeReceiver } from "@typechain-types";

import { WithdrawParams, WithdrawParamsInput } from "@utils/models/common/feeReceiver";
import { getWithdrawSignatures } from "@utils/signatures/common/feeReceiver";


// withdraw
export async function getWithdrawTx(
    feeReceiver: FeeReceiver,
    signer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {},
) {
    return await feeReceiver.connect(signer).withdraw(
        params.receiver,
        params.currencies,
        params.values,
        params.signatures,
        txConfig,
    );
}

export async function getWithdrawTxByInput(
    feeReceiver: FeeReceiver,
    signer: SignerWithAddress,
    paramsInput: WithdrawParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {},
) {
    const params: WithdrawParams = {
        ...paramsInput,
        signatures: await getWithdrawSignatures(feeReceiver, paramsInput, admin, admins)
    };
    return await getWithdrawTx(feeReceiver, signer, params, txConfig);
}
