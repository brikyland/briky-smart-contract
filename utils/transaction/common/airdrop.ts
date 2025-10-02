import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Airdrop } from "@typechain-types";

import { AirdropParams } from "@utils/models/common/airdrop";


// airdrop
export async function getAirdropTx(
    signer: SignerWithAddress,
    airdrop: Airdrop,
    params: AirdropParams,
    txConfig = {}
) {
    return await airdrop.connect(signer).airdrop(
        params.receivers,
        params.amounts,
        params.currency,
        txConfig
    );
}
