import { BigNumber } from "ethers";

export enum ProposalRule {
    ApprovalBeyondQuorum,
    DisapprovalBeyondQuorum
}

export enum ProposalState {
    Nil,
    Pending,
    Voting,
    Executing,
    SuccessfulExecuted,
    UnsuccessfulExecuted,
    Disqualified,
    Rejected
}

export enum ProposalVerdict {
    Unsettled,
    Passed,
    Failed
}

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
    contextURI: string;
    reviewURI: string;
    currency: string;
}

export interface DisqualifyParams {
    proposalId: number;
    contextURI: string;
    reviewURI: string;
}

export interface LogExecutionParams {
    proposalId: number;
    logURI: string;
}

export interface ConcludeExecutionParams {
    proposalId: number;
    logURI: string;
    isSuccessful: boolean;
}

export enum ProposalVoteOption {
    Nil,
    Approval,
    Disapproval
}
