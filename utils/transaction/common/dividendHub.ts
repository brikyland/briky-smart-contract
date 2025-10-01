import {
    DividendHub,
    ProxyCaller
} from "@typechain-types";

import { IssueDividendParams } from "@utils/models/common/dividendHub";

export async function getIssueDividendTx(
    dividendHub: DividendHub,
    signer: any,
    params: IssueDividendParams,
    txConfig = {},
) {
    return await dividendHub.connect(signer).issueDividend(
        params.governor,
        params.tokenId,
        params.value,
        params.currency,
        params.data,
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
            params.data,
        ]),
        txConfig,
    );
}
