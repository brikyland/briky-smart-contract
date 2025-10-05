import { Admin, ERC721MortgageToken } from "@typechain-types";
import { ERC721BorrowParams, RegisterCollateralsParams, RegisterCollateralsParamsInput } from "@utils/models/lend/erc721MortgageToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getRegisterCollateralsSignatures } from "@utils/signatures/lend/erc721MortgageToken";
import { ContractTransaction } from "ethers";


// registerCollaterals
export async function getRegisterCollateralsTx(
    erc721MortgageToken: ERC721MortgageToken,
    signer: SignerWithAddress,
    params: RegisterCollateralsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return erc721MortgageToken.connect(signer).registerCollaterals(
        params.tokens,
        params.isCollateral,
        params.signatures,
        txConfig
    );
}

export async function getRegisterCollateralsTxByInput(
    erc721MortgageToken: ERC721MortgageToken,
    signer: SignerWithAddress,
    paramsInput: RegisterCollateralsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RegisterCollateralsParams = {
        ...paramsInput,
        signatures: await getRegisterCollateralsSignatures(erc721MortgageToken, paramsInput, admin, admins)
    };
    return getRegisterCollateralsTx(erc721MortgageToken, signer, params, txConfig);
}


// borrow
export async function getERC721BorrowTx(
    erc721MortgageToken: ERC721MortgageToken,
    signer: SignerWithAddress,
    params: ERC721BorrowParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return erc721MortgageToken.connect(signer).borrow(
        params.token,
        params.tokenId,
        params.principal,
        params.repayment,
        params.currency,
        params.duration,
        txConfig
    );
}
