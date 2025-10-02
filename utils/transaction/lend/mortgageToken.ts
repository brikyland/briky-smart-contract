import { MortgageToken } from "@typechain-types";
import { LendParams, RepayParams, SafeLendParams, SafeRepayParams, UpdateBaseURIParams, UpdateFeeRateParams } from "@utils/models/lend/mortgageToken";

export async function getUpdateBaseURITx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
) {
    return await mortgageToken.connect(deployer).updateBaseURI(
        params.uri,
        params.signatures,
        txConfig
    );
}

export async function getUpdateFeeRateTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: UpdateFeeRateParams,
    txConfig = {}
) {
    return await mortgageToken.connect(deployer).updateFeeRate(
        params.feeRate,
        params.signatures,
        txConfig
    );
}

export async function getLendTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: LendParams,
    txConfig = {}
) {
    return await mortgageToken.connect(deployer).lend(
        params.mortgageId,
        txConfig
    );
}

export async function getSafeLendTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: SafeLendParams,
    txConfig = {}
) {
    return await mortgageToken.connect(deployer).safeLend(
        params.mortgageId,
        params.anchor,
        txConfig
    );
}

export async function getRepayTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: RepayParams,
    txConfig = {}
) {
    return await mortgageToken.connect(deployer).repay(
        params.mortgageId,
        txConfig
    );
}

export async function getSafeRepayTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: SafeRepayParams,
    txConfig = {}
) {
    return await mortgageToken.connect(deployer).safeRepay(
        params.mortgageId,
        params.anchor,
        txConfig
    );
}