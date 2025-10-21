import { ethers } from 'ethers';

// @typechain-types
import { Admin, Auction } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/liquidity
import { StartAuctionParamsInput, UpdateStakeTokensParamsInput } from '@utils/models/liquidity/auction';

// updateStakeTokens
export async function getUpdateStakeTokensSignatures(
    auction: Auction,
    paramsInput: UpdateStakeTokensParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    let message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address', 'address', 'address'],
        [
            auction.address,
            'updateStakeTokens',
            paramsInput.stakeToken1,
            paramsInput.stakeToken2,
            paramsInput.stakeToken3,
        ]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// startAuction
export async function getStartAuctionSignatures(
    auction: Auction,
    paramsInput: StartAuctionParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'uint256', 'uint256'],
        [auction.address, 'startAuction', paramsInput.endAt, paramsInput.vestingDuration]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
