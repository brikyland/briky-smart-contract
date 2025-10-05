import {Admin, Auction} from "@typechain-types";
import {DepositParams, StartAuctionParams, StartAuctionParamsInput, UpdateStakeTokensParams, UpdateStakeTokensParamsInput} from "@utils/models/liquidity/auction";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import { getStartAuctionSignatures, getUpdateStakeTokensSignatures } from "@utils/signatures/liquidity/auction";
import { ContractTransaction } from "ethers";


// updateStakeTokens
export async function getUpdateStakeTokensTx(
    auction: Auction,
    deployer: SignerWithAddress,
    params: UpdateStakeTokensParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction.connect(deployer).updateStakeTokens(
        params.stakeToken1,
        params.stakeToken2,
        params.stakeToken3,
        params.signatures,
        txConfig
    );
}

export async function getUpdateStakeTokensTxByInput(
    auction: Auction,
    deployer: SignerWithAddress,
    paramsInput: UpdateStakeTokensParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateStakeTokensParams = {
        ...paramsInput,
        signatures: await getUpdateStakeTokensSignatures(auction, paramsInput, admin, admins)
    };
    return getUpdateStakeTokensTx(auction, deployer, params, txConfig);
}


// startAuction
export async function getStartAuctionTx(
    auction: Auction,
    deployer: SignerWithAddress,
    params: StartAuctionParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction.connect(deployer).startAuction(
        params.endAt,
        params.vestingDuration,
        params.signatures,
        txConfig
    );
}

export async function getStartAuctionTxByInput(
    auction: Auction,
    deployer: SignerWithAddress,
    paramsInput: StartAuctionParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: StartAuctionParams = {
        ...paramsInput,
        signatures: await getStartAuctionSignatures(auction, paramsInput, admin, admins)
    };
    return getStartAuctionTx(auction, deployer, params, txConfig);
}


// deposit
export async function getDepositTx(
    auction: Auction,
    deployer: SignerWithAddress,
    params: DepositParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction.connect(deployer).deposit(
        params.value,
        txConfig
    );
}


// withdraw
export async function getWithdrawTx(
    auction: Auction,
    deployer: SignerWithAddress,
    txConfig = {}
): Promise<ContractTransaction> {
    return auction.connect(deployer).withdraw(txConfig);
}