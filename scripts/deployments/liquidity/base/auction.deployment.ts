import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployAuction } from '@utils/deployments/liquidity/auction';

export async function deployOrUpgradeAuction(
    signer: any,
    roundName: string,
) {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const Auction = await ethers.getContractFactory('Auction', signer);
    return config[`${roundName}AuctionAddress`] ?
        await (async () => {
            await upgrades.upgradeProxy(
                config[`${roundName}AuctionAddress`],
                Auction,
            );
            console.log(`Contract Auction has been updated to address ${config[`${roundName}AuctionAddress`]}`);
            return config[`${roundName}AuctionAddress`];
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const primaryTokenAddress = config.primaryTokenAddress;
            assert.ok(
                primaryTokenAddress,
                `Missing ${networkName}_PRIMARY_TOKEN_ADDRESS from environment variables!`
            );

            const auction = await deployAuction(
                signer,
                adminAddress,
                primaryTokenAddress,
            );
            console.log(`Contract Auction has been deployed to address ${auction.address}`);

            return auction.address;
        })();
}