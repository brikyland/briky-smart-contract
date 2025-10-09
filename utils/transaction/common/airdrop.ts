import { ContractTransaction } from "ethers";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Airdrop } from "@typechain-types";

import { AirdropParams } from "@utils/models/common/airdrop";


// airdrop
export async function getAirdropTx_Airdrop(
    airdrop: Airdrop,
    signer: SignerWithAddress,
    params: AirdropParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await airdrop.connect(signer).airdrop(
        params.receivers,
        params.amounts,
        params.currency,
        txConfig
    );
}
