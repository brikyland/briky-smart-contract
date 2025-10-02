import { PassportToken } from "@typechain-types";
import {
    UpdateBaseURIParams,
    UpdateFeeParams,
    UpdateRoyaltyRateParams,
    WithdrawParams
} from "@utils/models/lucra/passportToken";

export async function getUpdateBaseURITx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
) {
    return await passportToken.connect(deployer).updateBaseURI(
        params.uri,
        params.signatures,
        txConfig
    );
}

export async function getUpdateFeeTx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateFeeParams,
    txConfig = {}
) {
    return await passportToken.connect(deployer).updateFee(
        params.fee,
        params.signatures,
        txConfig
    );
}

export async function getUpdateRoyaltyRateTx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: UpdateRoyaltyRateParams,
    txConfig = {}
) {
    return await passportToken.connect(deployer).updateRoyaltyRate(
        params.royaltyRate,
        params.signatures,
        txConfig
    );
}

export async function getWithdrawTx(
    passportToken: PassportToken,
    deployer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {}
) {
    return await passportToken.connect(deployer).withdraw(
        params.receiver,
        params.currencies,
        params.values,
        params.signatures,
        txConfig
    );
}