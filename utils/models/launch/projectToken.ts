import { BigNumber } from "ethers";

export interface RegisterInitiatorParams {
    zone: string;
    initiator: string;
    uri: string;
}

export interface UpdateProjectURIParams {
    projectId: BigNumber;
    uri: string;
}

export interface LaunchProjectParams {
    zone: string;
    launchId: BigNumber;
    initiator: string;
    uri: string;
}

export interface MintParams {
    projectId: BigNumber;
    amount: BigNumber;
}

export interface DeprecateProjectParams {
    projectId: BigNumber;
    data: string;
}

export interface SafeDeprecateProjectParams {
    projectId: BigNumber;
    data: string;
    anchor: string;
}

export interface TokenizeProjectParams {
    projectId: BigNumber;
    custodian: string;
    broker: string;
}

export interface SafeTokenizeProjectParams {
    projectId: BigNumber;
    custodian: string;
    broker: string;
    anchor: string;
}

export interface UpdateProjectURIParams {
    projectId: BigNumber;
    uri: string;
}

export interface SafeUpdateProjectURIParams {
    projectId: BigNumber;
    uri: string;
    anchor: string;
}
