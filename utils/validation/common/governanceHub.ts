import { Contract, Wallet } from 'ethers';
import { ethers } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { time } from '@nomicfoundation/hardhat-network-helpers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { GovernanceHub } from '@typechain-types';

// @utils
import { MockValidator } from '@utils/mockValidator';

// @utils/models/common
import {
    AdmitParamsInput,
    ConcludeExecutionParamsInput,
    DisqualifyParamsInput,
    LogExecutionParamsInput,
    ProposeParamsInput,
} from '@utils/models/common/governanceHub';
import { Validation } from '@utils/models/common/validatable';

// propose
export async function getProposeValidation(
    governanceHub: GovernanceHub,
    params: ProposeParamsInput,
    validator: MockValidator,
    operator: SignerWithAddress | Wallet | Contract,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'address', 'bytes32', 'address', 'uint8', 'uint256', 'uint40', 'uint40'],
        [
            params.governor,
            params.tokenId,
            operator.address,
            params.uuid,
            params.operator,
            params.rule,
            params.quorumRate,
            params.duration,
            params.admissionExpiry,
        ]
    );

    return isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);
}

// admit
export async function getAdmitValidation(
    governanceHub: GovernanceHub,
    params: AdmitParamsInput,
    validator: MockValidator,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'string', 'string', 'address'],
        [params.proposalId, params.contextURI, params.reviewURI, params.currency]
    );

    return isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);
}

// disqualify
export async function getDisqualifyValidation(
    governanceHub: GovernanceHub,
    params: DisqualifyParamsInput,
    validator: MockValidator,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'string', 'string'],
        [params.proposalId, params.contextURI, params.reviewURI]
    );

    return isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);
}

// logExecution
export async function getLogExecutionValidation(
    governanceHub: GovernanceHub,
    params: LogExecutionParamsInput,
    validator: MockValidator,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], [params.proposalId, params.logURI]);

    return isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);
}

// concludeExecution
export async function getConcludeExecutionValidation(
    governanceHub: Contract,
    params: ConcludeExecutionParamsInput,
    validator: MockValidator,
    isValid: boolean = true
): Promise<Validation> {
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    const content = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'string', 'bool'],
        [params.proposalId, params.logURI, params.isSuccessful]
    );

    return isValid
        ? await validator.getValidation(governanceHub, content, expiry)
        : await validator.getInvalidValidation(governanceHub, content, expiry);
}
