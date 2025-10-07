import { LendParams, RepayParams } from "@utils/models/lend/mortgageToken";
import { BigNumber, Contract } from "ethers";


// safeLend
export async function getSafeLendAnchor(
    mortgageToken: Contract,
    params: LendParams
): Promise<BigNumber> {
    return (await mortgageToken.getMortgage(params.mortgageId)).principal;
}


// safeRepay
export async function getSafeRepayAnchor(
    mortgageToken: Contract,
    params: RepayParams
): Promise<BigNumber> {
    return (await mortgageToken.getMortgage(params.mortgageId)).repayment;
}
