import { Admin, Auction } from "@typechain-types";
import { callTransaction } from "@utils/blockchain";
import { StartAuctionParams, StartAuctionParamsInput, UpdateStakeTokensParams, UpdateStakeTokensParamsInput } from "@utils/models/liquidity/auction";
import { getStartAuctionSignatures, getUpdateStakeTokensSignatures } from "@utils/signatures/liquidity/auction";
import { getStartAuctionTx, getUpdateStakeTokensTx } from "@utils/transaction/liquidity/auction";

export async function callAuction_UpdateStakeTokens(
    auction: Auction,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateStakeTokensParamsInput,
) {
    const params: UpdateStakeTokensParams = {
        ...paramsInput,
        signatures: await getUpdateStakeTokensSignatures(auction, admins, admin, paramsInput),
    };
    await callTransaction(getUpdateStakeTokensTx(auction, deployer, params));
}

export async function callAuction_StartAuction(
    auction: Auction,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: StartAuctionParamsInput,
) {
    const params: StartAuctionParams = {
        ...paramsInput,
        signatures: await getStartAuctionSignatures(auction, admins, admin, paramsInput),
    };
    await callTransaction(getStartAuctionTx(auction, deployer, params));
}
