import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, Auction } from '@typechain-types';

// @utils/models/liquidity
import {
    DepositParams,
    StakeParams,
    StartAuctionParams,
    StartAuctionParamsInput,
    UpdateStakeTokensParams,
    UpdateStakeTokensParamsInput,
} from '@utils/models/liquidity/auction';

// @utils/signatures/liquidity
import { getStartAuctionSignatures, getUpdateStakeTokensSignatures } from '@utils/signatures/liquidity/auction';

// updateStakeTokens
export async function getAuctionTx_UpdateStakeTokens(
    auction: Auction,
    deployer: SignerWithAddress,
    params: UpdateStakeTokensParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction
        .connect(deployer)
        .updateStakeTokens(params.stakeToken1, params.stakeToken2, params.stakeToken3, params.signatures, txConfig);
}

export async function getAuctionTxByInput_UpdateStakeTokens(
    auction: Auction,
    deployer: SignerWithAddress,
    paramsInput: UpdateStakeTokensParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateStakeTokensParams = {
        ...paramsInput,
        signatures: await getUpdateStakeTokensSignatures(auction, paramsInput, admin, admins),
    };
    return getAuctionTx_UpdateStakeTokens(auction, deployer, params, txConfig);
}

// startAuction
export async function getAuctionTx_StartAuction(
    auction: Auction,
    deployer: SignerWithAddress,
    params: StartAuctionParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction.connect(deployer).startAuction(params.endAt, params.vestingDuration, params.signatures, txConfig);
}

export async function getAuctionTxByInput_StartAuction(
    auction: Auction,
    deployer: SignerWithAddress,
    paramsInput: StartAuctionParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: StartAuctionParams = {
        ...paramsInput,
        signatures: await getStartAuctionSignatures(auction, paramsInput, admin, admins),
    };
    return getAuctionTx_StartAuction(auction, deployer, params, txConfig);
}

// deposit
export async function getAuctionTx_Deposit(
    auction: Auction,
    deployer: SignerWithAddress,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction.connect(deployer).deposit(params.value, txConfig);
}

// withdraw
export async function getAuctionTx_Withdraw(
    auction: Auction,
    deployer: SignerWithAddress,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction.connect(deployer).withdraw(txConfig);
}

// stake
export async function getAuctionTx_Stake(
    auction: Auction,
    deployer: SignerWithAddress,
    params: StakeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction.connect(deployer).stake(params.stake1, params.stake2, txConfig);
}
