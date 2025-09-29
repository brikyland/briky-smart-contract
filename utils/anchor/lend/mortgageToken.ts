import { MortgageToken } from "@typechain-types";
import { LendParams, RepayParams } from "@utils/models/lend/mortgageToken";
import { BigNumber } from "ethers";

export async function getSafeLendAnchor(
    mortgageToken: MortgageToken,
    params: LendParams
): Promise<BigNumber> {
    return (await mortgageToken.getMortgage(params.mortgageId)).principal;
}

export async function getSafeRepayAnchor(
    mortgageToken: MortgageToken,
    params: RepayParams
): Promise<BigNumber> {
    return (await mortgageToken.getMortgage(params.mortgageId)).repayment;
}
