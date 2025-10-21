import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { EstateMortgageToken } from '@typechain-types';

// @utils/models/lend
import { EstateBorrowParams } from '@utils/models/lend/estateMortgageToken';

// borrow
export async function getEstateMortgageTokenTx_Borrow(
    estateMortgageToken: EstateMortgageToken,
    signer: SignerWithAddress,
    params: EstateBorrowParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await estateMortgageToken
        .connect(signer)
        .borrow(
            params.estateId,
            params.amount,
            params.principal,
            params.repayment,
            params.currency,
            params.duration,
            txConfig
        );
}
