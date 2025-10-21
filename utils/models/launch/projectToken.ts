import { BigNumber } from 'ethers';

// @utils/models/common
import { Validation } from '@utils/models/common/validatable';

// updateBaseURI
export interface UpdateBaseURIParamsInput {
    uri: string;
}

export interface UpdateBaseURIParams extends UpdateBaseURIParamsInput {
    signatures: string[];
}

// updateZoneRoyaltyRate
export interface UpdateZoneRoyaltyRateParamsInput {
    zone: string;
    royaltyRate: BigNumber;
}

export interface UpdateZoneRoyaltyRateParams extends UpdateZoneRoyaltyRateParamsInput {
    signatures: string[];
}

// authorizeLaunchpads
export interface AuthorizeLaunchpadParamsInput {
    accounts: string[];
    isLaunchpad: boolean;
}

export interface AuthorizeLaunchpadParams extends AuthorizeLaunchpadParamsInput {
    signatures: string[];
}

// registerInitiator
export interface RegisterInitiatorParamsInput {
    zone: string;
    initiator: string;
    uri: string;
}

export interface RegisterInitiatorParams extends RegisterInitiatorParamsInput {
    validation: Validation;
}

// launchProject
export interface LaunchProjectParams {
    zone: string;
    launchId: BigNumber;
    initiator: string;
    uri: string;
}

// mint
export interface MintParams {
    projectId: BigNumber;
    amount: BigNumber;
}

// withdrawEstateToken
export interface WithdrawEstateTokenParams {
    projectId: BigNumber;
}

// safeDeprecateProject
export interface DeprecateProjectParams {
    projectId: BigNumber;
    data: string;
}

export interface SafeDeprecateProjectParams extends DeprecateProjectParams {
    anchor: string;
}

// safeUpdateProjectURI
export interface UpdateProjectURIParamsInput {
    projectId: BigNumber;
    uri: string;
}

export interface UpdateProjectURIParams extends UpdateProjectURIParamsInput {
    validation: Validation;
}

export interface SafeUpdateProjectURIParams extends UpdateProjectURIParams {
    anchor: string;
}

// safeTokenizeProject
export interface TokenizeProjectParams {
    projectId: BigNumber;
    custodian: string;
    broker: string;
}

export interface SafeTokenizeProjectParams extends TokenizeProjectParams {
    anchor: string;
}
