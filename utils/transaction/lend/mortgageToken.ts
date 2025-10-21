import { Contract, ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin } from '@typechain-types';

// @utils/anchor/lend
import { getSafeLendAnchor, getSafeRepayAnchor } from '@utils/anchor/lend/mortgageToken';

// @utils/models/lend
import {
    CancelParams,
    ForecloseParams,
    LendParams,
    RepayParams,
    SafeLendParams,
    SafeRepayParams,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeRateParams,
    UpdateFeeRateParamsInput,
} from '@utils/models/lend/mortgageToken';

// @utils/signatures/lend
import { getUpdateBaseURISignatures, getUpdateFeeRateSignatures } from '@utils/signatures/lend/mortgageToken';

// updateBaseURI
export async function getMortgageTokenTx_UpdateBaseURI(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).updateBaseURI(params.uri, params.signatures, txConfig);
}

export async function getMortgageTokenTxByInput_UpdateBaseURI(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(mortgageToken, paramsInput, admin, admins),
    };
    return getMortgageTokenTx_UpdateBaseURI(mortgageToken, deployer, params, txConfig);
}

// updateFeeRate
export async function getMortgageTokenTx_UpdateFeeRate(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: UpdateFeeRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).updateFeeRate(params.feeRate, params.signatures, txConfig);
}

export async function getMortgageTokenTxByInput_UpdateFeeRate(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    paramsInput: UpdateFeeRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateFeeRateParams = {
        ...paramsInput,
        signatures: await getUpdateFeeRateSignatures(mortgageToken, paramsInput, admin, admins),
    };
    return getMortgageTokenTx_UpdateFeeRate(mortgageToken, deployer, params, txConfig);
}

// cancel
export async function getMortgageTokenTx_Cancel(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: CancelParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).cancel(params.mortgageId, txConfig);
}

// lend
export async function getMortgageTokenTx_Lend(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: LendParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).lend(params.mortgageId, txConfig);
}

// safeLend
export async function getMortgageTokenTx_SafeLend(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: SafeLendParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).safeLend(params.mortgageId, params.anchor, txConfig);
}

export async function getMortgageTokenTxByParams_SafeLend(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: LendParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeLendParams = {
        ...params,
        anchor: await getSafeLendAnchor(mortgageToken, params),
    };
    return getMortgageTokenTx_SafeLend(mortgageToken, deployer, safeParams, txConfig);
}

// repay
export async function getMortgageTokenTx_Repay(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: RepayParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).repay(params.mortgageId, txConfig);
}

// safeRepay
export async function getMortgageTokenTx_SafeRepay(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: SafeRepayParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).safeRepay(params.mortgageId, params.anchor, txConfig);
}

export async function getMortgageTokenTxByParams_SafeRepay(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: RepayParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeRepayParams = {
        ...params,
        anchor: await getSafeRepayAnchor(mortgageToken, params),
    };
    return getMortgageTokenTx_SafeRepay(mortgageToken, deployer, safeParams, txConfig);
}

// foreclose
export async function getMortgageTokenTx_Foreclose(
    mortgageToken: Contract,
    deployer: SignerWithAddress,
    params: ForecloseParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return mortgageToken.connect(deployer).foreclose(params.mortgageId, txConfig);
}
