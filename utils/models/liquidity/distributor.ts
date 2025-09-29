
import { BigNumberish } from "ethers";

export interface DistributeTokenParamsInput {
    receivers: string[];
    amounts: BigNumberish[];
    note: string;
}

export interface DistributeTokenParams extends DistributeTokenParamsInput {
    signatures: string[];    
}
