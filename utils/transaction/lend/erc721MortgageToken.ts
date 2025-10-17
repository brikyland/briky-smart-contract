import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, ERC721MortgageToken } from '@typechain-types';

// @utils/models/lend
import {
    ERC721BorrowParams,
    RegisterCollateralsParams,
    RegisterCollateralsParamsInput,
} from '@utils/models/lend/erc721MortgageToken';

// @utils/signatures/lend
import { getRegisterCollateralsSignatures } from '@utils/signatures/lend/erc721MortgageToken';

// registerCollaterals
export async function getERC721MortgageTokenTx_RegisterCollaterals(
    erc721MortgageToken: ERC721MortgageToken,
    signer: SignerWithAddress,
    params: RegisterCollateralsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return erc721MortgageToken
        .connect(signer)
        .registerCollaterals(params.tokens, params.isCollateral, params.signatures, txConfig);
}

export async function getERC721MortgageTokenTxByInput_RegisterCollaterals(
    erc721MortgageToken: ERC721MortgageToken,
    signer: SignerWithAddress,
    paramsInput: RegisterCollateralsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RegisterCollateralsParams = {
        ...paramsInput,
        signatures: await getRegisterCollateralsSignatures(erc721MortgageToken, paramsInput, admin, admins),
    };
    return getERC721MortgageTokenTx_RegisterCollaterals(erc721MortgageToken, signer, params, txConfig);
}

// borrow
export async function getERC721MortgageTokenTx_Borrow(
    erc721MortgageToken: ERC721MortgageToken,
    signer: SignerWithAddress,
    params: ERC721BorrowParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return erc721MortgageToken
        .connect(signer)
        .borrow(
            params.token,
            params.tokenId,
            params.principal,
            params.repayment,
            params.currency,
            params.duration,
            txConfig
        );
}
