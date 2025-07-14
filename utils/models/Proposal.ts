export enum ProposalVoteOption {
    Nil,
    Approval,
    Disapproval
}

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
