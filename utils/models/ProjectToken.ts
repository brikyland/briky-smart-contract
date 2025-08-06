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
