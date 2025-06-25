import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    PromotionToken,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC721Upgradeable__factory,
    IERC4906Upgradeable__factory,
} from '@typechain-types';
import { getSignatures } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { getInterfaceID } from '@utils/utils';
import { Initialization } from './test.initialization';
import { callPromotionToken_CancelContents, callPromotionToken_CreateContents, callPromotionToken_Pause } from '@utils/callWithSignatures/promotionToken';
import { deployPromotionToken } from '@utils/deployments/lucra/promotionToken';

interface PromotionTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    promotionToken: PromotionToken;

    deployer: any;
    admins: any[];
    minter1: any;
    minter2: any;
    minter3: any;
}

describe('17. PromotionToken', async () => {
    async function promotionTokenFixture(): Promise<PromotionTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const minter1 = accounts[Constant.ADMIN_NUMBER + 1];
        const minter2 = accounts[Constant.ADMIN_NUMBER + 2];
        const minter3 = accounts[Constant.ADMIN_NUMBER + 3];
        
        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const feeReceiver = await deployFeeReceiver(
            deployer.address,
            admin.address
        ) as FeeReceiver;

        const promotionToken = await deployPromotionToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            Initialization.PASSPORT_TOKEN_Name,
            Initialization.PASSPORT_TOKEN_Symbol,
            Initialization.PASSPORT_TOKEN_Fee,
            Initialization.PASSPORT_TOKEN_RoyaltyRate,
        ) as PromotionToken;

        return {
            admin,
            feeReceiver,
            promotionToken,
            deployer,
            admins,
            minter1,
            minter2,
            minter3,
        };
    };

    async function beforePromotionTokenTest({
        pause = false,
        listSampleContents = false,
    } = {}): Promise<PromotionTokenFixture> {
        const fixture = await loadFixture(promotionTokenFixture);
        const { promotionToken, admin, admins } = fixture;

        let currentTimestamp = await time.latest();

        if (listSampleContents) {            
            await callPromotionToken_CreateContents(
                promotionToken,
                admins,
                ["testing_uri_1", "testing_uri_2", "testing_uri_3"],
                [currentTimestamp + 100, currentTimestamp + 400, currentTimestamp + 800],
                [200, 1600, 3200],
                await admin.nonce()
            );
        }

        if (pause) {
            await callPromotionToken_Pause(promotionToken, admins, await admin.nonce());
        }

        return {
            ...fixture,
        }
    }

    describe('17.1. initialize(address, address, string, string, string, uint256, uint256)', async () => {
        it('17.1.1. Deploy successfully', async () => {
            const { deployer, admin, feeReceiver } = await beforePromotionTokenTest();

            const PromotionToken = await ethers.getContractFactory('PromotionToken', deployer);

            const promotionToken = await upgrades.deployProxy(
                PromotionToken,
                [
                    admin.address,
                    feeReceiver.address,
                    Initialization.PASSPORT_TOKEN_Name,
                    Initialization.PASSPORT_TOKEN_Symbol,
                    Initialization.PASSPORT_TOKEN_Fee,
                    Initialization.PASSPORT_TOKEN_RoyaltyRate,
                ]
            ) as PromotionToken;
            await promotionToken.deployed();
            
            expect(await promotionToken.admin()).to.equal(admin.address);
            expect(await promotionToken.feeReceiver()).to.equal(feeReceiver.address);

            expect(await promotionToken.name()).to.equal(Initialization.PASSPORT_TOKEN_Name);
            expect(await promotionToken.symbol()).to.equal(Initialization.PASSPORT_TOKEN_Symbol);
            
            expect(await promotionToken.tokenNumber()).to.equal(0);
            expect(await promotionToken.contentNumber()).to.equal(0);            

            const fee = await promotionToken.fee();
            expect(fee).to.equal(Initialization.PASSPORT_TOKEN_Fee);

            const royaltyRate = await promotionToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(Initialization.PASSPORT_TOKEN_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const tx = promotionToken.deployTransaction;
            await expect(tx).to
                .emit(promotionToken, 'FeeUpdate').withArgs(Initialization.PASSPORT_TOKEN_Fee)
                .emit(promotionToken, 'RoyaltyRateUpdate').withArgs(Initialization.PASSPORT_TOKEN_RoyaltyRate);
        });

        it('17.1.2. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin, feeReceiver } = await beforePromotionTokenTest();

            const PromotionToken = await ethers.getContractFactory('PromotionToken', deployer);

            await expect(upgrades.deployProxy(PromotionToken, [
                admin.address,
                feeReceiver.address,
                Initialization.PASSPORT_TOKEN_Name,
                Initialization.PASSPORT_TOKEN_Symbol,
                Initialization.PASSPORT_TOKEN_Fee,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    // TODO: Andy
    describe('17.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('17.3. unpause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('17.4. updateFee(uint256, bytes[])', async () => {

    });

    describe('17.5. getContent(uint256)', async () => {
        it('17.5.1. return successfully with valid content id', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            await expect(promotionToken.getContent(1)).to.not.be.reverted;
            await expect(promotionToken.getContent(2)).to.not.be.reverted;
            await expect(promotionToken.getContent(3)).to.not.be.reverted;
        });

        it('17.5.2. revert with invalid content id', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            await expect(promotionToken.getContent(0)).to.be
                .revertedWithCustomError(promotionToken, 'InvalidContentId');
            await expect(promotionToken.getContent(10)).to.be
                .revertedWithCustomError(promotionToken, 'InvalidContentId');
        });
    });

    describe('17.6. createContents(string[], uint40[], uint40[], bytes[])', async () => {
        it('17.6.1. create contents successfully', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest();

            const currentTimestamp = await time.latest();

            const startAt1 = currentTimestamp + 100;
            const startAt2 = currentTimestamp + 400;
            const startAt3 = currentTimestamp + 800;
            const duration1 = 200;
            const duration2 = 1600;
            const duration3 = 3200;

            const uris = ["testing_uri_1", "testing_uri_2", "testing_uri_3"];
            const startAts = [startAt1, startAt2, startAt3];
            const durations = [duration1, duration2, duration3];

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string[]", "uint40[]", "uint40[]"],
                [promotionToken.address, "createContents", uris, startAts, durations]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await promotionToken.createContents(uris, startAts, durations, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(promotionToken, 'NewContent')
                .withArgs(1, "testing_uri_1", startAt1, duration1)
                .emit(promotionToken, 'NewContent')
                .withArgs(2, "testing_uri_2", startAt2, duration2)
                .emit(promotionToken, 'NewContent')
                .withArgs(3, "testing_uri_3", startAt3, duration3);

            expect(await promotionToken.contentNumber()).to.equal(3);
            
            const content1 = await promotionToken.getContent(1);
            expect(content1.uri).to.equal("testing_uri_1");
            expect(content1.startAt).to.equal(startAt1);
            expect(content1.endAt).to.equal(startAt1 + duration1);
            
            const content2 = await promotionToken.getContent(2);
            expect(content2.uri).to.equal("testing_uri_2");
            expect(content2.startAt).to.equal(startAt2);
            expect(content2.endAt).to.equal(startAt2 + duration2);

            const content3 = await promotionToken.getContent(3);
            expect(content3.uri).to.equal("testing_uri_3");
            expect(content3.startAt).to.equal(startAt3);
            expect(content3.endAt).to.equal(startAt3 + duration3);
        });

        it('17.6.2. create contents unsuccessfully with invalid signatures', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest();

            const currentTimestamp = await time.latest();

            const startAt1 = currentTimestamp + 100;
            const startAt2 = currentTimestamp + 400;
            const startAt3 = currentTimestamp + 800;
            const duration1 = 200;
            const duration2 = 1600;
            const duration3 = 3200;

            const uris = ["testing_uri_1", "testing_uri_2", "testing_uri_3"];
            const startAts = [startAt1, startAt2, startAt3];
            const durations = [duration1, duration2, duration3];

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string[]", "uint40[]", "uint40[]"],
                [promotionToken.address, "createContents", uris, startAts, durations]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(promotionToken.createContents(uris, startAts, durations, invalidSignatures))
                .to.be.revertedWithCustomError(promotionToken, 'FailedVerification');
        })

        async function testRevert(fixture: PromotionTokenFixture, uris: string[], startAts: number[], durations: number[], customError: string) {
            const { promotionToken, admin, admins } = fixture;

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string[]", "uint40[]", "uint40[]"],
                [promotionToken.address, "createContents", uris, startAts, durations]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(promotionToken.createContents(uris, startAts, durations, signatures))
                .to.be.revertedWithCustomError(promotionToken, customError);
        }

        it('17.6.3. create contents unsuccessfully with invalid input', async () => {
            const fixture = await beforePromotionTokenTest();
            
            const currentTimestamp = await time.latest();

            const startAt1 = currentTimestamp + 100;
            const startAt2 = currentTimestamp + 400;
            const startAt3 = currentTimestamp + 800;
            const duration1 = 200;
            const duration2 = 1600;
            const duration3 = 3200;

            const uris = ["testing_uri_1", "testing_uri_2", "testing_uri_3"];
            const startAts = [startAt1, startAt2, startAt3];
            const durations = [duration1, duration2, duration3];
            
            await testRevert(fixture, uris.slice(0, 2), startAts, durations, 'InvalidInput');
            await testRevert(fixture, uris, startAts.slice(0, 2), durations, 'InvalidInput');
            await testRevert(fixture, uris, startAts, durations.slice(0, 2), 'InvalidInput');
        });
    });

    describe('17.7. updateContentURIs(uint256[],string[], bytes[])', async () => {
        it('17.7.1. update content uris successfully', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const contentIds = [1, 2];
            const uris = ["testing_uri_1_updated", "testing_uri_2_updated"];

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256[]", "string[]"],
                [promotionToken.address, "updateContentURIs", contentIds, uris]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await promotionToken.updateContentURIs(contentIds, uris, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(promotionToken, 'ContentURIUpdate')
                .withArgs(1, "testing_uri_1_updated")
                .emit(promotionToken, 'ContentURIUpdate')
                .withArgs(2, "testing_uri_2_updated");

            expect((await promotionToken.getContent(1)).uri).to.equal("testing_uri_1_updated");
            expect((await promotionToken.getContent(2)).uri).to.equal("testing_uri_2_updated");
            expect((await promotionToken.getContent(3)).uri).to.equal("testing_uri_3");
        });

        it('17.7.2. update content uris unsuccessfully with invalid signatures', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const contentIds = [1, 2];
            const uris = ["testing_uri_1_updated", "testing_uri_2_updated"];

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256[]", "string[]"],
                [promotionToken.address, "updateContentURIs", contentIds, uris]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(promotionToken.updateContentURIs(contentIds, uris, invalidSignatures))
                .to.be.revertedWithCustomError(promotionToken, 'FailedVerification');
        });

        async function testRevert(fixture: PromotionTokenFixture, contentIds: number[], uris: string[], customError: string) {
            const { promotionToken, admin, admins } = fixture;

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256[]", "string[]"],
                [promotionToken.address, "updateContentURIs", contentIds, uris]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(promotionToken.updateContentURIs(contentIds, uris, signatures))
                .to.be.revertedWithCustomError(promotionToken, customError);
        }

        it('17.7.3. update content uris unsuccessfully with invalid input', async () => {
            const fixture = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const contentIds = [1, 2, 3];
            const uris = ["testing_uri_1_updated", "testing_uri_2_updated"];

            await testRevert(fixture, contentIds, uris, 'InvalidInput');
        });

        it('17.7.4. update content uris unsuccessfully with invalid content id', async () => {
            const fixture = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const contentIds = [1, 0];
            const uris = ["testing_uri_1_updated", "testing_uri_2_updated"];

            await testRevert(fixture, contentIds, uris, 'InvalidContentId');
        });

        it('17.7.5. update content uris unsuccessfully with already started content', async () => {
            const fixture = await beforePromotionTokenTest({
                listSampleContents: true,
            });
            const { promotionToken } = fixture;

            const contentIds = [1];
            const uris = ["testing_uri_1_updated"];

            const startAt = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt);

            await testRevert(fixture, contentIds, uris, 'AlreadyStarted');
        });
    });

    describe('17.8. cancelContents(uint256, bytes[])', async () => {
        it('17.8.1. cancel contents successfully', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            const startAt2 = (await promotionToken.getContent(2)).startAt;
            const startAt3 = (await promotionToken.getContent(3)).startAt;
            const endAt1 = (await promotionToken.getContent(1)).endAt;
            const endAt2 = (await promotionToken.getContent(2)).endAt;
            const endAt3 = (await promotionToken.getContent(3)).endAt;
            
            const cancelAt = startAt1 + 50;
            // assuming startAt1 < cancelAt < endAt1 < startAt2 < startAt3 < endAt2 < endAt3

            await time.setNextBlockTimestamp(cancelAt);

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256[]"],
                [promotionToken.address, "cancelContents", [1, 2]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await promotionToken.cancelContents([1, 2], signatures);
            await tx.wait();

            await expect(tx).to
                .emit(promotionToken, 'ContentCancellation')
                .withArgs(1)
                .emit(promotionToken, 'ContentCancellation')
                .withArgs(2);

            expect(await promotionToken.contentNumber()).to.equal(3);

            const content1 = await promotionToken.getContent(1);
            expect(content1.uri).to.equal("testing_uri_1");
            expect(content1.startAt).to.equal(startAt1);
            expect(content1.endAt).to.equal(cancelAt);

            const content2 = await promotionToken.getContent(2);
            expect(content2.uri).to.equal("testing_uri_2");
            expect(content2.startAt).to.equal(startAt2);
            expect(content2.endAt).to.equal(cancelAt);

            const content3 = await promotionToken.getContent(3);
            expect(content3.uri).to.equal("testing_uri_3");
            expect(content3.startAt).to.equal(startAt3);
            expect(content3.endAt).to.equal(endAt3);
        });

        it('17.8.2. cancel contents unsuccessfully with invalid signatures', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const cancelAt = (await promotionToken.getContent(1)).startAt + 50;
            await time.setNextBlockTimestamp(cancelAt);

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256[]"],
                [promotionToken.address, "cancelContents", [1, 2]]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(promotionToken.cancelContents([1, 2], invalidSignatures))
                .to.be.revertedWithCustomError(promotionToken, 'FailedVerification');
        });

        it('17.8.3. revert with invalid content id', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const cancelAt = (await promotionToken.getContent(1)).startAt + 50;
            await time.setNextBlockTimestamp(cancelAt);

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256[]"],
                [promotionToken.address, "cancelContents", [1, 2, 0]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(promotionToken.cancelContents([1, 2, 0], signatures))
                .to.be.revertedWithCustomError(promotionToken, 'InvalidContentId');
        });

        it('17.8.4. cancel contents unsuccessfully with ended events', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const cancelAt = (await promotionToken.getContent(1)).endAt;
            await time.setNextBlockTimestamp(cancelAt);

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256[]"],
                [promotionToken.address, "cancelContents", [1, 2]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(promotionToken.cancelContents([1, 2], signatures))
                .to.be.revertedWithCustomError(promotionToken, 'AlreadyEnded');
        });

        it('17.8.5. cancel contents unsuccessfully with already cancelled content', async () => {
            const { promotionToken, admin, admins } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const cancelAt = (await promotionToken.getContent(1)).startAt + 50;
            await time.setNextBlockTimestamp(cancelAt);

            await callPromotionToken_CancelContents(promotionToken, admins, [1, 2], await admin.nonce());

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256[]"],
                [promotionToken.address, "cancelContents", [2, 3]]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(promotionToken.cancelContents([2, 3], signatures))
                .to.be.revertedWithCustomError(promotionToken, 'AlreadyEnded');
        });
    });

    describe('17.9. mint(uint256, uint256)', async () => {
        it('17.9.1. mint successfully', async () => {
            const { promotionToken, minter1, minter2 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const fee = await promotionToken.fee();

            const initMinter1Balance = await ethers.provider.getBalance(minter1.address);
            const initMinter2Balance = await ethers.provider.getBalance(minter2.address);
            const initPromotionTokenBalance = await ethers.provider.getBalance(promotionToken.address);

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            // Mint 5 tokens with just enough value
            const amount1 = 2;
            let tokenIdStart = (await promotionToken.tokenNumber()).add(1);
            let tokenIdEnd = tokenIdStart.add(amount1).sub(1);

            const tx1 = await promotionToken.connect(minter1).mint(1, amount1, { value: fee.mul(amount1) });
            const receipt1 = await tx1.wait();

            for(let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                await expect(tx1).to
                    .emit(promotionToken, 'NewToken')
                    .withArgs(i, 1, minter1.address);
            }

            expect(await promotionToken.tokenNumber()).to.equal(tokenIdEnd);
            expect(await promotionToken.balanceOf(minter1.address)).to.equal(amount1);
            for(let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                const contentURI = (await promotionToken.getContent(1)).uri;
                expect(await promotionToken.ownerOf(i)).to.equal(minter1.address);
                expect(await promotionToken.tokenURI(i)).to.equal(contentURI);
            }

            const tx1GasFee = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter1.address)).to.equal(initMinter1Balance.sub(tx1GasFee).sub(fee.mul(amount1)));
            expect(await ethers.provider.getBalance(promotionToken.address)).to.equal(initPromotionTokenBalance.add(fee.mul(amount1)));
            
            // Refund when minting with more value than needed

            const minter1BalanceAfterTx1 = await ethers.provider.getBalance(minter1.address);
            const amount2 = 4;
            tokenIdStart = (await promotionToken.tokenNumber()).add(1);
            tokenIdEnd = tokenIdStart.add(amount2).sub(1);

            const tx2 = await promotionToken.connect(minter1).mint(1, amount2, { value: fee.mul(amount2).add(ethers.utils.parseEther('1')) });
            const receipt2 = await tx2.wait();
            
            for(let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                await expect(tx2).to
                    .emit(promotionToken, 'NewToken')
                    .withArgs(i, 1, minter1.address);
            }

            expect(await promotionToken.tokenNumber()).to.equal(tokenIdEnd);
            expect(await promotionToken.balanceOf(minter1.address)).to.equal(amount1 + amount2);
            for(let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                const contentURI = (await promotionToken.getContent(1)).uri;
                expect(await promotionToken.ownerOf(i)).to.equal(minter1.address);
                expect(await promotionToken.tokenURI(i)).to.equal(contentURI);
            }

            const tx2GasFee = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter1.address)).to.equal(minter1BalanceAfterTx1.sub(tx2GasFee).sub(fee.mul(amount2)));
            expect(await ethers.provider.getBalance(promotionToken.address)).to.equal(initPromotionTokenBalance.add(fee.mul(amount1 + amount2)));

            // Another minter with another content
            const startAt2 = (await promotionToken.getContent(2)).startAt;
            await time.setNextBlockTimestamp(startAt2);

            const amount3 = 8;
            tokenIdStart = (await promotionToken.tokenNumber()).add(1);
            tokenIdEnd = tokenIdStart.add(amount3).sub(1);

            const tx3 = await promotionToken.connect(minter2).mint(2, amount3, { value: fee.mul(amount3) });
            const receipt3 = await tx3.wait();

            for(let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                await expect(tx3).to
                    .emit(promotionToken, 'NewToken')
                    .withArgs(i, 2, minter2.address);
            }

            expect(await promotionToken.tokenNumber()).to.equal(tokenIdEnd);
            expect(await promotionToken.balanceOf(minter2.address)).to.equal(amount3);
            for(let i = tokenIdStart; i.lte(tokenIdEnd); i = i.add(1)) {
                const contentURI = (await promotionToken.getContent(2)).uri;
                expect(await promotionToken.ownerOf(i)).to.equal(minter2.address);
                expect(await promotionToken.tokenURI(i)).to.equal(contentURI);
            }

            const tx3GasFee = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter2.address)).to.equal(initMinter2Balance.sub(tx3GasFee).sub(fee.mul(amount3)));
            expect(await ethers.provider.getBalance(promotionToken.address)).to.equal(initPromotionTokenBalance.add(fee.mul(amount1 + amount2 + amount3)));
        });

        it('17.9.2. mint successfully when paused', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
                pause: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            const fee = await promotionToken.fee();
            await expect(promotionToken.connect(minter1).mint(1, 1, { value: fee }))
                .to.be.revertedWith('Pausable: paused');
        });

        it('17.9.3. mint unsuccessfully with invalid amount', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            await expect(promotionToken.connect(minter1).mint(1, 0))
                .to.be.revertedWithCustomError(promotionToken, 'InvalidInput');
        });

        it('17.9.4. mint unsuccessfully with invalid content id', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            const fee = await promotionToken.fee();
            await expect(promotionToken.connect(minter1).mint(0, 1, { value: fee }))
                .to.be.revertedWithCustomError(promotionToken, 'InvalidContentId');
            await expect(promotionToken.connect(minter1).mint(100, 1, { value: fee }))
                .to.be.revertedWithCustomError(promotionToken, 'InvalidContentId');
        });

        it('17.9.5. mint unsuccessfully with unopened content', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1 - 1);

            await expect(promotionToken.connect(minter1).mint(1, 1))
                .to.be.revertedWithCustomError(promotionToken, 'NotOpened');
        });

        it('17.9.6. mint unsuccessfully with ended content', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const endAt1 = (await promotionToken.getContent(1)).endAt;
            await time.setNextBlockTimestamp(endAt1 + 1);

            await expect(promotionToken.connect(minter1).mint(1, 1))
                .to.be.revertedWithCustomError(promotionToken, 'AlreadyEnded');
        }); 

        it('17.9.7. mint unsuccessfully with insufficient value', async () => {
            const { promotionToken, minter1 } = await beforePromotionTokenTest({
                listSampleContents: true,
            });

            const startAt1 = (await promotionToken.getContent(1)).startAt;
            await time.setNextBlockTimestamp(startAt1);

            await expect(promotionToken.connect(minter1).mint(1, 1))
                .to.be.revertedWithCustomError(promotionToken, 'InsufficientValue');
        });
    });

    describe('17.10. supportsInterface(bytes4)', async () => {
        it('17.10.1. return true for IERC4906Upgradeable interface', async () => {
            const { promotionToken } = await beforePromotionTokenTest();

            const IERC4906Upgradeable = IERC4906Upgradeable__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();

            const IERC4906UpgradeableInterfaceId = getInterfaceID(IERC4906Upgradeable)
                .xor(getInterfaceID(IERC165Upgradeable))
                .xor(getInterfaceID(IERC721Upgradeable))

            expect(await promotionToken.supportsInterface(IERC4906UpgradeableInterfaceId._hex)).to.equal(true);
        });
    });
});
