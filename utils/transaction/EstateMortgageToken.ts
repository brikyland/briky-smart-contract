import { EstateMortgageToken } from "@typechain-types";
import { EstateBorrowParams } from "@utils/models/EstateMortgageToken";

export async function getEstateBorrowTx(
    estateMortgageToken: EstateMortgageToken,
    signer: any,
    params: EstateBorrowParams,
) {
    return await estateMortgageToken.connect(signer).borrow(
        params.estateId,
        params.amount,
        params.principal,
        params.repayment,
        params.currency,
        params.duration,
    );
}
