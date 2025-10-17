import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Airdrop } from '@typechain-types';

// @utils/models/common
import { AirdropParams } from '@utils/models/common/airdrop';

// airdrop
export async function getAirdropTx_Airdrop(
    airdrop: Airdrop,
    signer: SignerWithAddress,
    params: AirdropParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await airdrop.connect(signer).airdrop(params.receivers, params.amounts, params.currency, txConfig);
}
