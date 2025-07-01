import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import assert from 'assert';
import { getAddressShortString } from '@utils/utils';

async function watchPromotionToken() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const promotionToken = await ethers.getContractAt('PromotionToken', config.promotionTokenAddress);
    
    const fee = await promotionToken.fee();
    const royaltyRate = await promotionToken.royaltyRate();
    const admin = await promotionToken.admin();

    assert(admin !== ethers.constants.AddressZero, 'Admin should not be zero address');
    assert(fee.gt(0), 'Fee should be positive');
    assert(royaltyRate.gte(0) && royaltyRate.lte(ethers.utils.parseEther('1')), 'Royalty rate should be between 0 and 100%');

    console.log('admin:', admin);
    console.log("fee:", ethers.utils.formatEther(fee), "BNB");
    console.log("royaltyRate:", ethers.utils.formatEther(royaltyRate.mul(100)), "%")

    console.log("--------------------------------");
    
    const contentNumber = await promotionToken.contentNumber();
    console.log('contentNumber:', contentNumber.toNumber());
    
    for (let i = 1; i <= contentNumber.toNumber(); i++) {
        console.log('');
        const content = await promotionToken.getContent(i);
        console.log(`content(${i}) uri:`, content.uri);
        console.log(`content(${i}) start time:`, new Date(content.startAt * 1000).toLocaleString());
        console.log(`content(${i}) end time:`, new Date(content.endAt * 1000).toLocaleString());
    }

    console.log("--------------------------------");

    const tokenNumber = await promotionToken.tokenNumber();
    console.log('tokenNumber:', tokenNumber.toNumber());

    const owners = new Set<string>();
    
    for (let i = 1; i <= tokenNumber.toNumber(); i++) {
        console.log('');
        const tokenURI = await promotionToken.tokenURI(i);
        const owner = await promotionToken.ownerOf(i);
        const balance = await promotionToken.balanceOf(owner);

        // Assertions for each token
        assert(tokenURI.length > 0, `Token URI for token ${i} should not be empty`);
        assert(owner !== ethers.constants.AddressZero, `Owner of token ${i} should not be zero address`);
        assert(balance.gt(0), `Balance of owner ${owner} should be greater than 0`);

        console.log(`tokenURI(${i}):`, tokenURI);
        console.log(`owner(${i}):`, getAddressShortString(owner));
        console.log(`balance(${getAddressShortString(owner)}):`, balance.toNumber());        

        owners.add(owner);
    }

    console.log("--------------------------------");

    for (const owner of owners) {
        for (let i = 1; i <= contentNumber.toNumber(); i++) {
            const mintCount = await promotionToken.mintCounts(owner, i);
            if (mintCount.gt(0)) {
                console.log(`mintCounts(${getAddressShortString(owner)}, ${i}):`, mintCount.toNumber());
            }
        }
    }

    console.log("--------------------------------");

    const balance = await ethers.provider.getBalance(promotionToken.address);
    const expectedBalance = fee.mul(tokenNumber);
    assert(balance.eq(expectedBalance), `PromotionToken balance should be equal to ${ethers.utils.formatEther(expectedBalance)} BNB`);
    console.log('PromotionToken balance:', ethers.utils.formatEther(balance), 'BNB');
    
    console.log('✅ All assertions passed!');
}

watchPromotionToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Assertion failed:', error.message);
        process.exit(1);
    });
