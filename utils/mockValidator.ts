import { BigNumber, ethers, Wallet } from 'ethers';

// @defi-wonderland/smock
import { MockContract } from '@defi-wonderland/smock';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/common
import { Validation } from '@utils/models/common/validatable';

export class MockValidator {
    public signer: Wallet;
    public nonce: BigNumber;

    constructor(signer: Wallet) {
        this.signer = signer;
        this.nonce = BigNumber.from(0);
    }

    async getValidation(
        validatable: ethers.Contract | MockContract<ethers.Contract>,
        content: string,
        expiry: BigNumber
    ) {
        const message = ethers.utils.defaultAbiCoder.encode(
            ['address', 'bytes', 'uint256', 'uint256'],
            [validatable.address, content, this.nonce, expiry]
        );
        const validation: Validation = {
            nonce: this.nonce,
            expiry: expiry,
            signature: (await getSignatures(message, [this.signer], this.nonce))[0],
        };

        this.nonce = this.nonce.add(1);

        return validation;
    }

    async getInvalidValidation(
        validatable: ethers.Contract | MockContract<ethers.Contract>,
        content: string,
        expiry: BigNumber
    ) {
        const message = ethers.utils.defaultAbiCoder.encode(
            ['address', 'bytes', 'uint256', 'uint256'],
            [validatable.address, content, this.nonce, expiry]
        );
        const validation: Validation = {
            nonce: this.nonce.add(1),
            expiry: expiry,
            signature: (await getSignatures(message, [this.signer], this.nonce))[0],
        };

        this.nonce = this.nonce.add(1);

        return validation;
    }

    getAddress() {
        return this.signer.address;
    }
}
