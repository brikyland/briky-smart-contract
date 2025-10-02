import { ProjectMortgageToken } from "@typechain-types";
import { ProjectBorrowParams } from "@utils/models/lend/projectMortgageToken";

export async function getProjectBorrowTx(
    projectMortgageToken: ProjectMortgageToken,
    signer: SignerWithAddress,
    params: ProjectBorrowParams,
) {
    return await projectMortgageToken.connect(signer).borrow(
        params.projectId,
        params.amount,
        params.principal,
        params.repayment,
        params.currency,
        params.duration,
    );
}
