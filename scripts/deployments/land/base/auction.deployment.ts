import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployAuction } from '../../../../utils/deployments/land/auction';

export async function deployOrUpgradeAuction(
    signer: any,
    roundName: string,
) {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
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
            const stakeToken1Address = config.stakeTokenAddress;
            assert.ok(
                stakeToken1Address,
                `Missing ${networkName}_STAKE_TOKEN_ADDRESS from environment variables!`
            );
            const stakeToken2Address = config.stakeTokenAddress;
            assert.ok(
                stakeToken2Address,
                `Missing ${networkName}_STAKE_TOKEN_ADDRESS from environment variables!`
            );
            const stakeToken3Address = config.stakeTokenAddress;
            assert.ok(
                stakeToken3Address,
                `Missing ${networkName}_STAKE_TOKEN_ADDRESS from environment variables!`
            );

            const auction = await deployAuction(
                signer,
                adminAddress,
                primaryTokenAddress,
                stakeToken3Address,
                stakeToken2Address,
                stakeToken3Address
            );
            console.log(`Contract Auction has been deployed to address ${auction.address}`);

            return auction.address;
        })();
}