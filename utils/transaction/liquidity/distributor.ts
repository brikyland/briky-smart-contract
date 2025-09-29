import { Distributor } from "@typechain-types";
import { DistributeTokenParams } from "@utils/models/liquidity/distributor";

export async function getDistributeTokenTx(
    distributor: Distributor,
    deployer: any,
    params: DistributeTokenParams,
    txConfig = {}
) {
    const tx = distributor.connect(deployer).distributeToken(
        params.receivers,
        params.amounts,
        params.note,
        params.signatures,
        txConfig
    );
    return tx;
}
