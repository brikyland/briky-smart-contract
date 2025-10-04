import {Admin, CommissionToken, EstateForger} from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { UpdateBaseURIParamsInput, UpdateRoyaltyRateParamsInput } from "@utils/models/land/commissionToken";
import { ethers } from "ethers";
import {UpdateBaseUnitPriceRangeParamsInput, WhitelistParamsInput} from "@utils/models/land/estateForger";


// updateBaseUnitPriceRange
export async function getUpdateBaseUnitPriceRangeSignatures(
    estateForger: EstateForger,
    paramsInput: UpdateBaseUnitPriceRangeParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "uint256"],
        [estateForger.address, "update", paramsInput.baseMinUnitPrice, paramsInput.baseMaxUnitPrice]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// whitelist
export async function getWhitelistSignatures(
    estateForger: EstateForger,
    paramsInput: WhitelistParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool[]"],
        [estateForger.address, "whitelist", paramsInput.accounts, paramsInput.isWhitelisted]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}