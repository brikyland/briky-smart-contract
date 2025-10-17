import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { ProjectMortgageToken } from '@typechain-types';

// @utils/models/lend
import { ProjectBorrowParams } from '@utils/models/lend/projectMortgageToken';

// borrow
export async function getProjectMortgageTokenTx_Borrow(
    projectMortgageToken: ProjectMortgageToken,
    signer: SignerWithAddress,
    params: ProjectBorrowParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await projectMortgageToken
        .connect(signer)
        .borrow(
            params.projectId,
            params.amount,
            params.principal,
            params.repayment,
            params.currency,
            params.duration,
            txConfig
        );
}
