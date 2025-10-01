import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Admin,
    MockValidatable,
} from '@typechain-types';
import { callTransaction, getSignatures, getValidationMessage, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployMockValidatable } from '@utils/deployments/mock/mockValidatable';
import { Validation } from '@utils/models/common/validatable';

interface ValidatableFixture {
    admin: Admin;
    validatable: MockValidatable;

    deployer: any;
    admins: any[];
    validator: any;
}

describe('1.b. Validatable', async () => {
    async function validatableFixture(): Promise<ValidatableFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const validator = accounts[Constant.ADMIN_NUMBER + 1];
  
        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const validatable = await deployMockValidatable(
            deployer,
            admin.address,
            validator.address
        ) as MockValidatable;

        return {
            admin,
            validatable,
            deployer,
            admins,
            validator,
        };
    };

    async function beforeValidatableTest(): Promise<ValidatableFixture> {
        const fixture = await loadFixture(validatableFixture);
        return fixture;
    }

    describe('1.b.1. __Validatable_init(address)', async () => {
        it('1.b.1.1. Init validator successfully after deploy', async () => {
            const { validatable, validator } = await beforeValidatableTest();

            expect(await validatable.validator()).to.equal(validator.address);
        });

        it('1.b.1.2. Init validator unsuccessfully when not initializing', async () => {
            const { validatable } = await beforeValidatableTest();

            const newValidator = randomWallet();

            await expect(validatable.testValidatableInitWhenNotInitilizing(newValidator.address))
                .to.be.revertedWith('Initializable: contract is not initializing');
        });
    });

    describe('1.b.2. updateValidator(address)', async () => {
        it('1.b.2.1. UpdateValidator successfully with valid signatures', async () => {
            const { admin, admins, validatable } = await beforeValidatableTest();

            const newValidator = randomWallet();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [validatable.address, "updateValidator", newValidator.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await validatable.updateValidator(newValidator.address, signatures);
            await tx.wait();

            expect(await validatable.validator()).to.equal(newValidator.address);

            await expect(tx).to
                .emit(validatable, 'ValidatorUpdate')
                .withArgs(newValidator.address);
        });

        it('1.b.2.2. UpdateValidator unsuccessfully with invalid signatures', async () => {
            const { admin, admins, validatable } = await beforeValidatableTest();

            const newValidator = randomWallet();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [validatable.address, "updateValidator", newValidator.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(validatable.updateValidator(newValidator.address, invalidSignatures))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('1.b.3. _validate(bytes, (uint256, uint256, bytes))', async () => {
        it('1.b.3.1. Validate successfully with valid signatures', async () => {
            const { validatable, validator } = await beforeValidatableTest();

            const content = "Bitcoin";
            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp + 1);

            let data = ethers.utils.defaultAbiCoder.encode(
                ["string"],
                [content]
            );
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
            const { validatable, validator } = await beforeValidatableTest();

            const content = "Bitcoin";
            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp + 1);

            let data = ethers.utils.defaultAbiCoder.encode(
                ["string"],
                [content]
            );
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce,
                expiry: expiry,
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            await expect(validatable.testValidation(content + "Blockchain", validation))
                .to.be.revertedWithCustomError(validatable, 'InvalidSignature');
        });

        it('1.b.3.3. Validate unsuccessfully with different nonce', async () => {
            const { validatable, validator } = await beforeValidatableTest();

            const content = "Bitcoin";
            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp + 1);

            let data = ethers.utils.defaultAbiCoder.encode(
                ["string"],
                [content]
            );
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce.add(1),
                expiry: expiry,
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            await expect(validatable.testValidation(content, validation))
                .to.be.revertedWithCustomError(validatable, 'InvalidSignature');
        });

        it('1.b.3.4. Validate unsuccessfully with different expiry', async () => {
            const { validatable, validator } = await beforeValidatableTest();

            const content = "Bitcoin";
            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp + 1);

            let data = ethers.utils.defaultAbiCoder.encode(
                ["string"],
                [content]
            );
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce,
                expiry: expiry.add(1),
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            await expect(validatable.testValidation(content, validation))
                .to.be.revertedWithCustomError(validatable, 'InvalidSignature');
        });

        it('1.b.3.5. Validate unsuccessfully with expired validation', async () => {
            const { validatable, validator } = await beforeValidatableTest();

            const content = "Bitcoin";
            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const nonce = ethers.BigNumber.from(1);
            const expiry1 = ethers.BigNumber.from(timestamp - 1);
            const expiry2 = ethers.BigNumber.from(timestamp);

            let data = ethers.utils.defaultAbiCoder.encode(
                ["string"],
                [content]
            );
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

            await expect(validatable.testValidation(content, validation1))
                .to.be.revertedWithCustomError(validatable, 'ValidationExpired');
            await expect(validatable.testValidation(content, validation2))
                .to.be.revertedWithCustomError(validatable, 'ValidationExpired');
        });

        it('1.b.3.6. Validate unsuccessfully with used nonce', async () => {
            const { validatable, validator } = await beforeValidatableTest();

            const content = "Bitcoin";
            let timestamp = await time.latest() + 10;

            const nonce = ethers.BigNumber.from(1);
            const expiry = ethers.BigNumber.from(timestamp - 1);

            let data = ethers.utils.defaultAbiCoder.encode(
                ["string"],
                [content]
            );
            let message = getValidationMessage(validatable, data, nonce, expiry);

            const validation: Validation = {
                nonce: nonce,
                expiry: expiry,
                signature: (await getSignatures(message, [validator], nonce))[0],
            };

            await callTransaction(validatable.testValidation(content, validation));

            await expect(validatable.testValidation(content, validation))
                .to.be.revertedWithCustomError(validatable, 'InvalidNonce');
        });
    });
});
