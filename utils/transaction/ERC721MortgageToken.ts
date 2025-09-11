import { ERC721MortgageToken } from "@typechain-types";
import { ERC721BorrowParams } from "@utils/models/ERC721MortgageToken";

export async function getERC721BorrowTx(
    erc721MortgageToken: ERC721MortgageToken,
    signer: any,
    params: ERC721BorrowParams,
) {
    return await erc721MortgageToken.connect(signer).borrow(
        params.token,
        params.tokenId,
        params.principal,
        params.repayment,
        params.currency,
        params.duration,
    );
}
