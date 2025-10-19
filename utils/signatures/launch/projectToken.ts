import { ethers } from 'ethers';

// @typechain-types
import { Admin, ProjectToken } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/launch
import {
    AuthorizeLaunchpadParamsInput,
    UpdateBaseURIParamsInput,
    UpdateZoneRoyaltyRateParamsInput,
} from '@utils/models/launch/projectToken';

// updateBaseURI
export async function getUpdateBaseURISignatures(
    projectToken: ProjectToken,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'string'],
        [projectToken.address, 'updateBaseURI', paramsInput.uri]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// updateZoneRoyaltyRate
export async function getUpdateZoneRoyaltyRateSignatures(
    projectToken: ProjectToken,
    paramsInput: UpdateZoneRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'bytes32', 'uint256'],
        [projectToken.address, 'updateZoneRoyaltyRate', paramsInput.zone, paramsInput.royaltyRate]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// authorizeLaunchpads
export async function getAuthorizeLaunchpadSignatures(
    projectToken: ProjectToken,
    paramsInput: AuthorizeLaunchpadParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [projectToken.address, 'authorizeLaunchpads', paramsInput.accounts, paramsInput.isLaunchpad]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
