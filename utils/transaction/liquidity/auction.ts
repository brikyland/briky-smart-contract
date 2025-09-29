import { Auction } from "@typechain-types";
import { StartAuctionParams, UpdateStakeTokensParams } from "@utils/models/liquidity/auction";

export async function getUpdateStakeTokensTx(
    auction: Auction,
    deployer: any,
    params: UpdateStakeTokensParams
) {
    const tx = auction.connect(deployer).updateStakeTokens(
        params.stakeToken1,
        params.stakeToken2,
        params.stakeToken3,
        params.signatures,
    );
    return tx;
}

export async function getStartAuctionTx(
    auction: Auction,
    deployer: any,
    params: StartAuctionParams
) {
    const tx = auction.connect(deployer).startAuction(
        params.endAt,
        params.vestingDuration,
        params.signatures,
    );
    return tx;
}
