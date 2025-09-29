import { time } from '@nomicfoundation/hardhat-network-helpers';
import { MockValidator } from '@utils/mockValidator';
import { ProposeParams, AdmitParams, DisqualifyParams, LogExecutionParams, ConcludeExecutionParams } from '@utils/models/common/governanceHub';
import { Validation } from '@utils/models/common/validatable';
import { Wallet, Contract } from 'ethers';
import { ethers } from 'hardhat';

export async function getProposeValidation(
    governanceHub: Contract,
    validator: MockValidator,
    operator: Wallet | Contract,
    params: ProposeParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address", "bytes32", "address", "uint8", "uint256", "uint40", "uint40"],
        [params.governor, params.tokenId, operator.address, params.uuid, params.operator, params.rule, params.quorumRate, params.duration, params.admissionExpiry]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

export async function getProposeInvalidValidation(
    governanceHub: Contract,
    validator: MockValidator,
    operator: Wallet | Contract,
    params: ProposeParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address", "bytes32", "address", "uint8", "uint256", "uint40", "uint40"],
        [params.governor, params.tokenId, operator.address, params.uuid, params.operator, params.rule, params.quorumRate, params.duration, params.admissionExpiry]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

export async function getAdmitValidation(
    governanceHub: Contract,
    validator: MockValidator,
    params: AdmitParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string", "address"],
        [params.proposalId, params.contextURI, params.reviewURI, params.currency]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

export async function getAdmitInvalidValidation(
    governanceHub: Contract,
    validator: MockValidator,
    params: AdmitParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string", "address"],
        [params.proposalId, params.contextURI, params.reviewURI, params.currency]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

export async function getDisqualifyValidation(
    governanceHub: Contract,
    validator: MockValidator,
    params: DisqualifyParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string"],
        [params.proposalId, params.contextURI, params.reviewURI]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

export async function getDisqualifyInvalidValidation(
    governanceHub: Contract,
    validator: MockValidator,
    params: DisqualifyParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "string"],
        [params.proposalId, params.contextURI, params.reviewURI]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

export async function getLogExecutionValidation(
    governanceHub: Contract,
    validator: MockValidator,
    params: LogExecutionParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.proposalId, params.logURI]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

export async function getLogExecutionInvalidValidation(
    governanceHub: Contract,
    validator: MockValidator,
    params: LogExecutionParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string"],
        [params.proposalId, params.logURI]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}

export async function getConcludeExecutionValidation(
    governanceHub: Contract,
    validator: MockValidator,
    params: ConcludeExecutionParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "bool"],
        [params.proposalId, params.logURI, params.isSuccessful]
    );

    const validation = await validator.getValidation(governanceHub, content, expiry);
    return validation;
}

export async function getConcludeExecutionInvalidValidation(
    governanceHub: Contract,
    validator: MockValidator,
    params: ConcludeExecutionParams
): Promise<Validation> {
    const expiry = ethers.BigNumber.from(await time.latest() + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "string", "bool"],
        [params.proposalId, params.logURI, params.isSuccessful]
    );

    const validation = await validator.getInvalidValidation(governanceHub, content, expiry);
    return validation;
}
