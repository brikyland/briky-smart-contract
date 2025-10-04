import { ethers } from "ethers";

import {
    Admin,
    GovernanceHub
} from "@typechain-types";

import { getSignatures } from "@utils/blockchain";

import { UpdateFeeParamsInput } from "@utils/models/common/governanceHub";


// updateFee
export async function getUpdateFeeSignatures(
    governanceHub: GovernanceHub,
    paramsInput: UpdateFeeParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256"],
        [governanceHub.address, "updateFee", paramsInput.fee]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}