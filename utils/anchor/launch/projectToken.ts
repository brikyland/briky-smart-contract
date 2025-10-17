import { ethers } from 'ethers';

// @typechain-types
import { ProjectToken } from '@typechain-types';

// @utils/models/launch
import {
    DeprecateProjectParams,
    TokenizeProjectParams,
    UpdateProjectURIParamsInput,
} from '@utils/models/launch/projectToken';

// safeDeprecateProject
export async function getSafeDeprecateProjectAnchor(
    projectToken: ProjectToken,
    params: DeprecateProjectParams
): Promise<string> {
    const currentURI = await projectToken.uri(params.projectId);
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

// safeUpdateProjectURI
export async function getSafeUpdateProjectURIAnchor(
    projectToken: ProjectToken,
    params: UpdateProjectURIParamsInput
): Promise<string> {
    const currentURI = await projectToken.uri(params.projectId);
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

// safeTokenizeProject
export async function getSafeTokenizeProjectAnchor(
    projectToken: ProjectToken,
    params: TokenizeProjectParams
): Promise<string> {
    const currentURI = await projectToken.uri(params.projectId);
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}
