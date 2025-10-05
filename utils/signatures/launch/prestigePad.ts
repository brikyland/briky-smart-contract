import { Admin, PrestigePad } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import { ethers } from "ethers";
import { UpdateBaseUnitPriceRangeParamsInput } from "@utils/models/launch/prestigePad";


// updateBaseUnitPriceRange
export async function getUpdateBaseUnitPriceRangeSignatures(
    prestigePad: PrestigePad,
    paramsInput: UpdateBaseUnitPriceRangeParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "uint256", "uint256"],
        [prestigePad.address, "update", paramsInput.baseMinUnitPrice, paramsInput.baseMaxUnitPrice]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
