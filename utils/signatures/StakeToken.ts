import { getSignatures } from "@utils/blockchain";
import { 
    InitializeRewardingParamsInput,
    UpdateFeeRateParamsInput
} from "@utils/models/StakeToken";
import { StakeToken } from "@typechain-types";
import { Admin } from "@typechain-types";
import { ethers } from "ethers";

export async function getInitializeRewardingSignatures(
    stakeToken: StakeToken,
    admins: any[],
    admin: Admin,
    params: InitializeRewardingParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "address"],
        [stakeToken.address, "initializeRewarding", params.initialLastRewardFetch, params.successor]
    );
    return getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateFeeRateSignatures(
    stakeToken: StakeToken,
    admins: any[],
    admin: Admin,
    params: UpdateFeeRateParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [stakeToken.address, "updateFeeRate", params.feeRate]
    );
    return getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}