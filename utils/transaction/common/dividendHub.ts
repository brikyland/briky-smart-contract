import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { DividendHub, ProxyCaller } from '@typechain-types';

// @utils/models/common
import { IssueDividendParams, WithdrawParams } from '@utils/models/common/dividendHub';

// issueDividend
export async function getDividendTx_IssueDividend(
    dividendHub: DividendHub,
    signer: SignerWithAddress,
    params: IssueDividendParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await dividendHub
        .connect(signer)
        .issueDividend(params.governor, params.tokenId, params.value, params.currency, params.note, txConfig);
}

export async function getCallDividendHubTx_IssueDividend(
    dividendHub: DividendHub,
    caller: ProxyCaller,
    params: IssueDividendParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await caller.call(
        dividendHub.address,
        dividendHub.interface.encodeFunctionData('issueDividend', [
            params.governor,
            params.tokenId,
            params.value,
            params.currency,
            params.note,
        ]),
        txConfig
    );
}

// withdraw
export async function getWithdrawTx(
    signer: SignerWithAddress,
    dividendHub: DividendHub,
    params: WithdrawParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await dividendHub.connect(signer).withdraw(params.dividendIds, txConfig);
}
