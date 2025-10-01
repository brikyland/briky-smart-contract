import { BigNumber } from "ethers";

import { Validation } from "@utils/models/common/validatable";


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

export enum ProposalVoteOption {
    Nil,
    Approval,
    Disapproval
}


// updateFee
export interface UpdateFeeParamsInput {
    fee: BigNumber;
}

export interface UpdateFeeParams extends UpdateFeeParamsInput {
    signatures: string[];
}


// propose
export interface ProposeParamsInput {
    governor: string;
    tokenId: BigNumber;
    operator: string;
    uuid: string;
    rule: ProposalRule;
    quorumRate: BigNumber;
    duration: number;
    admissionExpiry: number;
}

export interface ProposeParams extends ProposeParamsInput {
    validation: Validation;
}


// admit
export interface AdmitParamsInput {
    proposalId: number;
    contextURI: string;
    reviewURI: string;
    currency: string;
}

export interface AdmitParams extends AdmitParamsInput {
    validation: Validation;
}


// disqualify
export interface DisqualifyParamsInput {
    proposalId: number;
    contextURI: string;
    reviewURI: string;
}

export interface DisqualifyParams extends DisqualifyParamsInput {
    validation: Validation;
}


// vote
export interface VoteParams {
    proposalId: number;
    voteOption: ProposalVoteOption;
}


// safeVote
export interface SafeVoteParams extends VoteParams {
    anchor: string;
}


// contributeBudget
export interface ContributeBudgetParams {
    proposalId: number;
    value: BigNumber;
}


// safeContributeBudget
export interface SafeContributeBudgetParams extends ContributeBudgetParams {
    anchor: string;
}


// withdrawBudgetContribution
export interface WithdrawBudgetContributionParams {
    proposalId: number;
}


// confirm
export interface ConfirmParams {
    proposalId: number;
}


// rejectExecution
export interface RejectExecutionParams {
    proposalId: number;
}


// logExecution
export interface LogExecutionParamsInput {
    proposalId: number;
    logURI: string;
}

export interface LogExecutionParams extends LogExecutionParamsInput {
    validation: Validation;
}


// concludeExecution
export interface ConcludeExecutionParamsInput {
    proposalId: number;
    logURI: string;
    isSuccessful: boolean;
}

export interface ConcludeExecutionParams extends ConcludeExecutionParamsInput {
    validation: Validation;
}
