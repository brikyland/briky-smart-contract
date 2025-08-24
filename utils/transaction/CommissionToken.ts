import { CommissionToken, ProxyCaller } from "@typechain-types";
import { ExtendBrokerExpirationParams, MintParams, RegisterBrokerParams } from "@utils/models/CommissionToken";
import { ContractTransaction } from "ethers";

export async function getRegisterBrokerTx(
    commissionToken: CommissionToken,
    deployer: any,
    params: RegisterBrokerParams
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).registerBroker(
        params.zone,
        params.broker,
        params.commissionRate,
        params.duration,
    );
}

export async function getExtendBrokerExpirationTx(
    commissionToken: CommissionToken,
    deployer: any,
    params: ExtendBrokerExpirationParams
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).extendBrokerExpiration(
        params.zone,
        params.broker,
        params.duration,
    );
}

export async function getMintTx(
    commissionToken: CommissionToken,
    caller: ProxyCaller,
    params: MintParams
): Promise<ContractTransaction> {
    return caller.call(
        commissionToken.address,
        commissionToken.interface.encodeFunctionData('mint', [
            params.zone,
            params.broker,
            params.tokenId,
        ])
    );
}
