import { ProjectMortgageToken } from "@typechain-types";
import { ProjectBorrowParams } from "@utils/models/lend/projectMortgageToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";


// borrow
export async function getProjectMortgageTokenTx_Borrow(
    projectMortgageToken: ProjectMortgageToken,
    signer: SignerWithAddress,
    params: ProjectBorrowParams,
    txConfig = {}
): Promise<ContractTransaction> {
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
