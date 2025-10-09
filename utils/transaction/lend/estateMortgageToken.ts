import { EstateMortgageToken } from "@typechain-types";
import { EstateBorrowParams } from "@utils/models/lend/estateMortgageToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";

// borrow
export async function getEstateMortgageTokenTx_Borrow(
    estateMortgageToken: EstateMortgageToken,
    signer: SignerWithAddress,
    params: EstateBorrowParams,
    txConfig = {}
): Promise<ContractTransaction> {
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
