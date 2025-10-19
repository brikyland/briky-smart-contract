import { ethers } from 'ethers';

// @typechain-types
import { Admin, ERC721MortgageToken } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/lend
import { RegisterCollateralsParamsInput } from '@utils/models/lend/erc721MortgageToken';

// registerCollaterals
export async function getRegisterCollateralsSignatures(
    erc721MortgageToken: ERC721MortgageToken,
    params: RegisterCollateralsParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [erc721MortgageToken.address, 'registerCollaterals', params.tokens, params.isCollateral]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
