import { DividendHub, ProxyCaller } from "@typechain-types";
import { IssueDividendParams } from "@utils/models/DividendHub";
import { BigNumber } from "ethers";

export async function getIssueDividendTx(
    dividendHub: DividendHub,
    signer: any,
    params: IssueDividendParams,
    value: BigNumber,
) {
    return await dividendHub.connect(signer).issueDividend(
        params.governor,
        params.tokenId,
        params.value,
        params.currency,
        params.data,
        { value: value },
    );
}

export async function getCallIssueDividendTx(
    dividendHub: DividendHub,
    caller: ProxyCaller,
    params: IssueDividendParams,
    value: BigNumber,
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
        { value: value },
    );
}
