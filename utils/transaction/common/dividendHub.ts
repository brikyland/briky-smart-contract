import {
    DividendHub,
    ProxyCaller
} from "@typechain-types";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { IssueDividendParams, WithdrawParams } from "@utils/models/common/dividendHub";


// issueDividend
export async function getIssueDividendTx(
    signer: SignerWithAddress,
    dividendHub: DividendHub,
    params: IssueDividendParams,
    txConfig = {},
) {
    return await dividendHub.connect(signer).issueDividend(
        params.governor,
        params.tokenId,
        params.value,
        params.currency,
        params.note,
        txConfig,
    );
}

export async function getCallIssueDividendTx(
    dividendHub: DividendHub,
    caller: ProxyCaller,
    params: IssueDividendParams,
    txConfig = {},
) {
    return await caller.call(
        dividendHub.address,
        dividendHub.interface.encodeFunctionData('issueDividend', [
            params.governor,
            params.tokenId,
            params.value,
            params.currency,
            params.note,
        ]),
        txConfig,
    );
}


// withdraw
export async function getWithdrawTx(
    signer: SignerWithAddress,
    dividendHub: DividendHub,
    params: WithdrawParams,
    txConfig = {},
) {
    return await dividendHub.connect(signer).withdraw(
        params.dividendIds,
        txConfig,
    );
}
