import { ethers } from 'ethers';

// @nomicfoundation/hardhat-network-helpers
import { time } from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import { EstateToken } from '@typechain-types';

// @utils
import { MockValidator } from '@utils/mockValidator';

// @utils/models/land
import { RegisterCustodianParamsInput, UpdateEstateURIParamsInput } from '@utils/models/land/estateToken';

// registerCustodian
export async function getRegisterCustodianValidation(
    estateToken: EstateToken,
    paramsInput: RegisterCustodianParamsInput,
    validator: MockValidator,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'string'],
        [paramsInput.zone, paramsInput.custodian, paramsInput.uri]
    );
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    return isValid
        ? await validator.getValidation(estateToken, content, expiry)
        : await validator.getInvalidValidation(estateToken, content, expiry);
}

// updateEstateURI
export async function getUpdateEstateURIValidation(
    estateToken: EstateToken,
    paramsInput: UpdateEstateURIParamsInput,
    validator: MockValidator,
    isValid: boolean = true
) {
    const content = ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], [paramsInput.estateId, paramsInput.uri]);
    const expiry = ethers.BigNumber.from((await time.latest()) + 1e9);

    return isValid
        ? await validator.getValidation(estateToken, content, expiry)
        : await validator.getInvalidValidation(estateToken, content, expiry);
}
