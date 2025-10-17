import { ethers } from 'ethers';

// @typechain-types
import { PrestigePad } from '@typechain-types';

// @utils/models/launch
import {
    ContributeCurrentRoundParams,
    ConfirmCurrentRoundParams,
    FinalizeParams,
} from '@utils/models/launch/prestigePad';

// safeContributeCurrentRound
export async function getSafeContributeCurrentRoundAnchor(
    prestigePad: PrestigePad,
    params: ContributeCurrentRoundParams
): Promise<string> {
    const currentURI = (await prestigePad.getLaunch(params.launchId)).uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

// safeConfirmCurrentRound
export async function getSafeConfirmCurrentRoundAnchor(
    prestigePad: PrestigePad,
    params: ConfirmCurrentRoundParams
): Promise<string> {
    const currentURI = (await prestigePad.getLaunch(params.launchId)).uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

// safeFinalize
export async function getSafeFinalizeAnchor(prestigePad: PrestigePad, params: FinalizeParams): Promise<string> {
    const currentURI = (await prestigePad.getLaunch(params.launchId)).uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}
