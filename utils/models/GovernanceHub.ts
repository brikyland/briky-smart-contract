import { BigNumber } from "ethers";
import { ProposalRule } from "./Proposal";

export interface ProposeParams {
    governor: string;
    tokenId: BigNumber;
    operator: string;
    uuid: string;
    rule: ProposalRule;
    quorumRate: BigNumber;
    duration: number;
    admissionExpiry: number;
}

export interface AdmitParams {
    proposalId: number;
    contentURI: string;
    stateURI: string;
    currency: string;
}

export interface DisqualifyParams {
    proposalId: number;
    contentURI: string;
    stateURI: string;
}

export interface UpdateExecutionParams {
    proposalId: number;
    stateURI: string;
}

export interface ConcludeExecutionParams {
    proposalId: number;
    stateURI: string;
    isSuccessful: boolean;
}

