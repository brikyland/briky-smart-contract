import { ProjectMortgageToken } from "@typechain-types";
import { ProjectBorrowParams } from "@utils/models/lend/projectMortgageToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


// borrow
export async function getProjectBorrowTx(
    projectMortgageToken: ProjectMortgageToken,
    signer: SignerWithAddress,
    params: ProjectBorrowParams,
    txConfig = {}
) {
    return await projectMortgageToken.connect(signer).borrow(
        params.projectId,
        params.amount,
        params.principal,
        params.repayment,
        params.currency,
        params.duration,
        txConfig
    );
}
