import { Distributor } from "@typechain-types";
import { DistributeTokenParams } from "@utils/models/liquidity/distributor";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function getDistributeTokenTx(
    distributor: Distributor,
    deployer: SignerWithAddress,
    params: DistributeTokenParams,
    txConfig = {}
) {
    return distributor.connect(deployer).distributeToken(
        params.receivers,
        params.amounts,
        params.note,
        params.signatures,
        txConfig
    );
}
