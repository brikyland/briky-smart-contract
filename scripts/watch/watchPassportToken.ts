import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import assert from 'assert';
import { getAddressShortString } from '@utils/utils';

async function watchPassportToken() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const passportToken = await ethers.getContractAt('PassportToken', config.passportTokenAddress);
    
    const fee = await passportToken.fee();
    const royaltyRate = await passportToken.royaltyRate();
    const admin = await passportToken.admin();

    assert(admin !== ethers.constants.AddressZero, 'Admin should not be zero address');
    assert(fee.gt(0), 'Fee should be positive');
    assert(royaltyRate.gte(0) && royaltyRate.lte(ethers.utils.parseEther('1')), 'Royalty rate should be between 0 and 100%');

    console.log('admin:', admin);
    console.log("fee:", ethers.utils.formatEther(fee), "BNB");
    console.log("royaltyRate:", ethers.utils.formatEther(royaltyRate.mul(100)), "%")    

    console.log("--------------------------------");

    const tokenNumber = await passportToken.tokenNumber();
    console.log('tokenNumber:', tokenNumber.toNumber());
    
    for (let i = 1; i <= tokenNumber.toNumber(); i++) {
        const tokenURI = await passportToken.tokenURI(i);
        const owner = await passportToken.ownerOf(i);
        const balance = await passportToken.balanceOf(owner);
        const hasMinted = await passportToken.hasMinted(owner);

        // Assertions for each token
        assert(tokenURI.length > 0, `Token URI for token ${i} should not be empty`);
        assert(owner !== ethers.constants.AddressZero, `Owner of token ${i} should not be zero address`);
        assert(balance.gt(0), `Balance of owner ${owner} should be greater than 0`);
        assert(hasMinted === true, `Owner ${owner} should have minted status`);

        console.log(`tokenURI(${i}):`, tokenURI);
        console.log(`owner(${i}):`, getAddressShortString(owner));
        console.log(`balance(${getAddressShortString(owner)}):`, balance.toNumber());
        console.log(`hasMinted(${getAddressShortString(owner)}):`, hasMinted);

        console.log("--------------------------------");
    }

    const balance = await ethers.provider.getBalance(passportToken.address);
    const expectedBalance = fee.mul(tokenNumber);
    assert(balance.eq(expectedBalance), `PassportToken balance should be equal to ${ethers.utils.formatEther(expectedBalance)} BNB`);
    console.log('PassportToken balance:', ethers.utils.formatEther(balance), 'BNB');
    
    console.log('✅ All assertions passed!');
}

watchPassportToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Assertion failed:', error.message);
        process.exit(1);
    });
