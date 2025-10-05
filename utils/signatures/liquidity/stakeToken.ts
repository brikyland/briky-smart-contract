import { getSignatures } from "@utils/blockchain";
import { 
    InitializeRewardingParamsInput,
    UpdateFeeRateParamsInput
} from "@utils/models/liquidity/stakeToken";
import { StakeToken } from "@typechain-types";
import { Admin } from "@typechain-types";
import { ethers } from "ethers";

export async function getInitializeRewardingSignatures(
    stakeToken: StakeToken,
    paramsInput: InitializeRewardingParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "address"],
        [stakeToken.address, "initializeRewarding", paramsInput.initialLastRewardFetch, paramsInput.successor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateFeeRateSignatures(
    stakeToken: StakeToken,
    paramsInput: UpdateFeeRateParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [stakeToken.address, "updateFeeRate", paramsInput.feeRate]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}