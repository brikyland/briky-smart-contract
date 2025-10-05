import {Auction} from "@typechain-types";
import {StartAuctionParams, UpdateStakeTokensParams} from "@utils/models/liquidity/auction";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

// updateStakeTokens
export async function getUpdateStakeTokensTx(
    auction: Auction,
    deployer: SignerWithAddress,
    params: UpdateStakeTokensParams,
    txConfig = {}
) {
    return auction.connect(deployer).updateStakeTokens(
        params.stakeToken1,
        params.stakeToken2,
        params.stakeToken3,
        params.signatures,
        txConfig
    );
}

export async function getStartAuctionTx(
    auction: Auction,
    deployer: SignerWithAddress,
    params: StartAuctionParams
) {
    return auction.connect(deployer).startAuction(
        params.endAt,
        params.vestingDuration,
        params.signatures,
    );
}
