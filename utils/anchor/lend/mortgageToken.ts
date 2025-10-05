import { MortgageToken } from "@typechain-types";
import { LendParams, RepayParams } from "@utils/models/lend/mortgageToken";
import { BigNumber } from "ethers";


// safeLend
export async function getSafeLendAnchor(
    mortgageToken: MortgageToken,
    params: LendParams
): Promise<BigNumber> {
    return (await mortgageToken.getMortgage(params.mortgageId)).principal;
}


// safeRepay
export async function getSafeRepayAnchor(
    mortgageToken: MortgageToken,
    params: RepayParams
): Promise<BigNumber> {
    return (await mortgageToken.getMortgage(params.mortgageId)).repayment;
}
