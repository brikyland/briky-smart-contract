import { time } from '@nomicfoundation/hardhat-network-helpers';
import { MockValidator } from '@utils/mockValidator';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { 
    ProposeParamsInput,
    AdmitParamsInput,
    DisqualifyParamsInput,
    LogExecutionParamsInput,
    ConcludeExecutionParamsInput
} from '@utils/models/common/governanceHub';
import { Validation } from '@utils/models/common/validatable';
import { Wallet, Contract } from 'ethers';
import { ethers } from 'hardhat';


// propose
export async function getProposeValidation(
    validator: MockValidator,
    governanceHub: Contract,
    params: ProposeParamsInput,
    operator: SignerWithAddress | Wallet | Contract,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address", "bytes32", "address", "uint8", "uint256", "uint40", "uint40"],
        [params.governor, params.tokenId, operator.address, params.uuid, params.operator, params.rule, params.quorumRate, params.duration, params.admissionExpiry]
    );

    const validation = isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);

    return validation;
}


// admit
export async function getAdmitValidation(
    validator: MockValidator,
    governanceHub: Contract,
    params: AdmitParamsInput,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string", "address"],
        [params.proposalId, params.contextURI, params.reviewURI, params.currency]
    );

    const validation = isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);

    return validation;
}


// disqualify
export async function getDisqualifyValidation(
    validator: MockValidator,
    governanceHub: Contract,
    params: DisqualifyParamsInput,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string"],
        [params.proposalId, params.contextURI, params.reviewURI]
    );

    const validation = isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);

    return validation;
}


// logExecution
export async function getLogExecutionValidation(
    validator: MockValidator,
    governanceHub: Contract,
    params: LogExecutionParamsInput,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.proposalId, params.logURI]
    );

    const validation = isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);

    return validation;
}


// concludeExecution
export async function getConcludeExecutionValidation(
    validator: MockValidator,
    governanceHub: Contract,
    params: ConcludeExecutionParamsInput,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "bool"],
        [params.proposalId, params.logURI, params.isSuccessful]
    );

    const validation = isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);

    return validation;
}
