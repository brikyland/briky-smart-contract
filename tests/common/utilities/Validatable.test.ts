import {expect} from 'chai';
import {ethers} from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import {Admin, MockValidatable} from '@typechain-types';

// @utils
import {callTransaction, getSignatures, getValidationMessage, randomWallet} from '@utils/blockchain';

// @utils/deployments/common
import {deployAdmin} from '@utils/deployments/common/admin';

// @utils/deployments/mock
import {deployMockValidatable} from '@utils/deployments/mock/common/mockValidatable';

// @utils/models/common
import {UpdateValidatorParams, UpdateValidatorParamsInput, Validation} from '@utils/models/common/validatable';

// @utils/signatures/common
import {getUpdateValidatorSignatures} from '@utils/signatures/common/validatable';

// @utils/transaction/common
import {
    getValidatableTx_UpdateValidator,
    getValidatableTxByInput_UpdateValidator,
} from '@utils/transaction/common/validatable';

interface ValidatableFixture {
    deployer: any;
    admins: any[];
    validator: any;

    admin: Admin;
    validatable: MockValidatable;
}

describe('1.b. Validatable', async () => {
    async function validatableFixture(): Promise<ValidatableFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, validator] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const validatable = (await deployMockValidatable(
            deployer,
            admin.address,
            validator.address
        )) as MockValidatable;

        return {
            admin,
            validatable,
            deployer,
            admins,
            validator,
        };
    }

    async function beforeValidatableTest(): Promise<ValidatableFixture> {
        return await loadFixture(validatableFixture);
    }

    /* --- Initialization --- */
    describe('1.b.1. __Validatable_init(address)', async () => {
        it('1.b.1.1. Init validator successfully after deployment', async () => {
            const { validator, validatable } = await beforeValidatableTest();

            expect(await validatable.validator()).to.equal(validator.address);
        });

        it('1.b.1.2. Init validator unsuccessfully when not initializing', async () => {
            const { validatable } = await beforeValidatableTest();

            const newValidator = randomWallet();

            await expect(validatable.testValidatableInitWhenNotInitilizing(newValidator.address)).to.be.revertedWith(
                'Initializable: contract is not initializing'
            );
        });
    });

    /* --- Administration --- */
    describe('1.b.2. updateValidator(address,bytes[])', async () => {
        it('1.b.2.1. Update validator successfully with valid signatures', async () => {
            const { deployer, admins, admin, validatable } = await beforeValidatableTest();

            const newValidator = randomWallet();

            const paramsInput: UpdateValidatorParamsInput = {
                validator: newValidator.address,
            };
            const tx = await getValidatableTxByInput_UpdateValidator(validatable, deployer, paramsInput, admin, admins);
            await tx.wait();

            expect(await validatable.validator()).to.equal(newValidator.address);

            await expect(tx).to.emit(validatable, 'ValidatorUpdate').withArgs(newValidator.address);
        });

        it('1.b.2.2. Update validator unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, validatable } = await beforeValidatableTest();

            const newValidator = randomWallet();

            const paramsInput: UpdateValidatorParamsInput = {
                validator: newValidator.address,
            };
            const params: UpdateValidatorParams = {
                ...paramsInput,
                signatures: await getUpdateValidatorSignatures(validatable, paramsInput, admin, admins, false),
            };
            await expect(getValidatableTx_UpdateValidator(validatable, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });
    });

    /* --- Helper --- */
    describe('1.b.3. _validate(bytes,(uint256,uint256,bytes))', async () => {
        it('1.b.3.1. Validate successfully with valid signatures', async () => {
            const { validator, validatable } = await beforeValidatableTest();

            const content = 'Bitcoin';
            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp + 1);

            let data = ethers.utils.defaultAbiCoder.encode(['string'], [content]);
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce,
                expiry: expiry,
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            const tx = await validatable.testValidation(content, validation);
            await tx.wait();

            expect(await validatable.isNonceUsed(nonce)).to.equal(true);
        });

        it('1.b.3.2. Validate unsuccessfully with different content', async () => {
            const { validator, validatable } = await beforeValidatableTest();

            const content = 'Bitcoin';
            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp + 1);

            let data = ethers.utils.defaultAbiCoder.encode(['string'], [content]);
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce,
                expiry: expiry,
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            await expect(validatable.testValidation(content + 'Blockchain', validation)).to.be.revertedWithCustomError(
                validatable,
                'InvalidSignature'
            );
        });

        it('1.b.3.3. Validate unsuccessfully with different nonce', async () => {
            const { validator, validatable } = await beforeValidatableTest();

            const content = 'Bitcoin';
            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp + 1);

            let data = ethers.utils.defaultAbiCoder.encode(['string'], [content]);
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce.add(1),
                expiry: expiry,
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            await expect(validatable.testValidation(content, validation)).to.be.revertedWithCustomError(
                validatable,
                'InvalidSignature'
            );
        });

        it('1.b.3.4. Validate unsuccessfully with different expiry', async () => {
            const { validator, validatable } = await beforeValidatableTest();

            const content = 'Bitcoin';
            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp + 1);

            let data = ethers.utils.defaultAbiCoder.encode(['string'], [content]);
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce,
                expiry: expiry.add(1),
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            await expect(validatable.testValidation(content, validation)).to.be.revertedWithCustomError(
                validatable,
                'InvalidSignature'
            );
        });

        it('1.b.3.5. Validate unsuccessfully with expired validation', async () => {
            const { validator, validatable } = await beforeValidatableTest();

            const content = 'Bitcoin';
            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry1 = ethers.BigNumber.from(timestamp - 1);
            const expiry2 = ethers.BigNumber.from(timestamp);

            let data = ethers.utils.defaultAbiCoder.encode(['string'], [content]);
            let message1 = getValidationMessage(validatable, data, nonce, expiry1);
            let message2 = getValidationMessage(validatable, data, nonce, expiry2);

            const validation1: Validation = {
                nonce: nonce,
                expiry: expiry1,
                signature: (await getSignatures(message1, [validator], nonce))[0],
            };
            const validation2: Validation = {
                nonce: nonce,
                expiry: expiry2,
                signature: (await getSignatures(message2, [validator], nonce))[0],
            };

            await expect(validatable.testValidation(content, validation1)).to.be.revertedWithCustomError(
                validatable,
                'ValidationExpired'
            );
            await expect(validatable.testValidation(content, validation2)).to.be.revertedWithCustomError(
                validatable,
                'ValidationExpired'
            );
        });

        it('1.b.3.6. Validate unsuccessfully with used nonce', async () => {
            const { validator, validatable } = await beforeValidatableTest();

            const content = 'Bitcoin';
            let timestamp = (await time.latest()) + 10;

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp - 1);

            let data = ethers.utils.defaultAbiCoder.encode(['string'], [content]);
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce,
                expiry: expiry,
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            await callTransaction(validatable.testValidation(content, validation));

            await expect(validatable.testValidation(content, validation)).to.be.revertedWithCustomError(
                validatable,
                'InvalidNonce'
            );
        });
    });
});
