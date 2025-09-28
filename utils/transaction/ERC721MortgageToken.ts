import { ERC721MortgageToken } from "@typechain-types";
import { ERC721BorrowParams, RegisterCollateralsParams } from "@utils/models/ERC721MortgageToken";
import { LendParams, RepayParams, SafeLendParams, SafeRepayParams } from "@utils/models/MortgageToken";

export async function getRegisterCollateralsTx(
    erc721MortgageToken: ERC721MortgageToken,
    signer: any,
    params: RegisterCollateralsParams,
) {
    return await erc721MortgageToken.connect(signer).registerCollaterals(
        params.tokens,
        params.isCollateral,
        params.signatures,
    );
}

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

export async function getLendTx(
    erc721MortgageToken: ERC721MortgageToken,
    signer: any,
    params: LendParams,
) {
    return await erc721MortgageToken.connect(signer).lend(
        params.mortgageId,
    );
}

export async function getSafeLendTx(
    erc721MortgageToken: ERC721MortgageToken,
    signer: any,
    params: SafeLendParams,
) {
    return await erc721MortgageToken.connect(signer).safeLend(
        params.mortgageId,
        params.anchor,
    );
}

export async function getRepayTx(
    erc721MortgageToken: ERC721MortgageToken,
    signer: any,
    params: RepayParams,
) {
    return await erc721MortgageToken.connect(signer).repay(
        params.mortgageId,
    );
}

export async function getSafeRepayTx(
    erc721MortgageToken: ERC721MortgageToken,
    signer: any,
    params: SafeRepayParams,
) {
    return await erc721MortgageToken.connect(signer).safeRepay(
        params.mortgageId,
        params.anchor,
    );
}
