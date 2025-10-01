import { ethers } from "ethers";

import { PrestigePad } from "@typechain-types";

import {
    ContributeCurrentRoundParams,
    ConfirmCurrentRoundParams,
    FinalizeLaunchParams,
} from "@utils/models/launch/prestigePad";

export async function getSafeContributeCurrentRoundAnchor(
    prestigePad: PrestigePad,
    params: ContributeCurrentRoundParams
): Promise<string> {
    const currentURI = (await prestigePad.getLaunch(params.launchId)).uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
};

export async function getSafeConfirmCurrentRoundParams(
    prestigePad: PrestigePad,
    params: ConfirmCurrentRoundParams
): Promise<string> {
    const currentURI = (await prestigePad.getLaunch(params.launchId)).uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

export async function getSafeFinalizeLaunchParams(
    prestigePad: PrestigePad,
    params: FinalizeLaunchParams
): Promise<string> {
    const currentURI = (await prestigePad.getLaunch(params.launchId)).uri;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}
