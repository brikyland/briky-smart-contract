import { CommissionToken, ProxyCaller } from "@typechain-types";
import { ActivateBrokerParams, MintParams, RegisterBrokerParams } from "@utils/models/land/commissionToken";
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
    );
}

export async function getActivateBrokerTx(
    commissionToken: CommissionToken,
    deployer: any,
    params: ActivateBrokerParams
): Promise<ContractTransaction> {
    return commissionToken.connect(deployer).activateBroker(
        params.zone,
        params.broker,
        params.isActive,
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
