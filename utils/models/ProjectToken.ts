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
