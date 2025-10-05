import { Admin, MortgageToken } from "@typechain-types";
import { ForecloseParams, LendParams, RepayParams, SafeLendParams, SafeRepayParams, UpdateBaseURIParams, UpdateBaseURIParamsInput, UpdateFeeRateParams, UpdateFeeRateParamsInput } from "@utils/models/lend/mortgageToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getUpdateBaseURISignatures, getUpdateFeeRateSignatures } from "@utils/signatures/lend/mortgageToken";
import { getSafeLendAnchor, getSafeRepayAnchor } from "@utils/anchor/lend/mortgageToken";
import { ContractTransaction } from "ethers";


// updateBaseURI
export async function getUpdateBaseURITx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).updateBaseURI(
        params.uri,
        params.signatures,
        txConfig
    );
}

export async function getUpdateBaseURITxByInput(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(mortgageToken, paramsInput, admin, admins)
    };
    return getUpdateBaseURITx(mortgageToken, deployer, params, txConfig);
}


// updateFeeRate
export async function getUpdateFeeRateTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: UpdateFeeRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).updateFeeRate(
        params.feeRate,
        params.signatures,
        txConfig
    );
}

export async function getUpdateFeeRateTxByInput(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateFeeRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateFeeRateParams = {
        ...paramsInput,
        signatures: await getUpdateFeeRateSignatures(mortgageToken, paramsInput, admin, admins)
    };
    return getUpdateFeeRateTx(mortgageToken, deployer, params, txConfig);
}


// lend
export async function getLendTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: LendParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).lend(
        params.mortgageId,
        txConfig
    );
}


// safeLend
export async function getSafeLendTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: SafeLendParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).safeLend(
        params.mortgageId,
        params.anchor,
        txConfig
    );
}

export async function getSafeLendTxByParams(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: LendParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeLendParams = {
        ...params,
        anchor: await getSafeLendAnchor(mortgageToken, params),
    };
    return getSafeLendTx(mortgageToken, deployer, safeParams, txConfig);
}


// repay
export async function getRepayTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: RepayParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).repay(
        params.mortgageId,
        txConfig
    );
}


// safeRepay
export async function getSafeRepayTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: SafeRepayParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).safeRepay(
        params.mortgageId,
        params.anchor,
        txConfig
    );
}

export async function getSafeRepayTxByParams(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: RepayParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeRepayParams = {
        ...params,
        anchor: await getSafeRepayAnchor(mortgageToken, params),
    };
    return getSafeRepayTx(mortgageToken, deployer, safeParams, txConfig);
}


// foreclose
export async function getForecloseTx(
    mortgageToken: MortgageToken,
    deployer: SignerWithAddress,
    params: ForecloseParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).foreclose(
        params.mortgageId,
        txConfig
    );
}
