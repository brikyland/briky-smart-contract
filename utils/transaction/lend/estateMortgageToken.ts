import { EstateMortgageToken } from "@typechain-types";
import { EstateBorrowParams } from "@utils/models/lend/estateMortgageToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


// borrow
export async function getEstateBorrowTx(
    estateMortgageToken: EstateMortgageToken,
    signer: SignerWithAddress,
    params: EstateBorrowParams,
    txConfig = {}
) {
    return await estateMortgageToken.connect(signer).borrow(
        params.estateId,
        params.amount,
        params.principal,
        params.repayment,
        params.currency,
        params.duration,
        txConfig
    );
}
