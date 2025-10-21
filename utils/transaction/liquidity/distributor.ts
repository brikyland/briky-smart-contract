import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, Distributor } from '@typechain-types';

// @utils/models/liquidity
import { DistributeTokenParams, DistributeTokenParamsInput } from '@utils/models/liquidity/distributor';

// @utils/signatures/liquidity
import { getDistributeTokenSignatures } from '@utils/signatures/liquidity/distributor';

// distributeToken
export async function getDistributorTx_DistributeToken(
    distributor: Distributor,
    deployer: SignerWithAddress,
    params: DistributeTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return distributor
        .connect(deployer)
        .distributeToken(params.receivers, params.amounts, params.note, params.signatures, txConfig);
}

export async function getDistributorTxByInput_DistributeToken(
    distributor: Distributor,
    deployer: SignerWithAddress,
    paramsInput: DistributeTokenParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: DistributeTokenParams = {
        ...paramsInput,
        signatures: await getDistributeTokenSignatures(distributor, paramsInput, admin, admins),
    };
    return getDistributorTx_DistributeToken(distributor, deployer, params, txConfig);
}
