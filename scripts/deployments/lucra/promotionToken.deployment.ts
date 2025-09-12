import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployPromotionToken } from '@utils/deployments/lucra/promotionToken';
import { Initialization } from './initialization';

async function deployOrUpgradePromotionToken() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const PromotionToken = await ethers.getContractFactory('PromotionToken', signer);
    const promotionTokenAddress = config.promotionTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.promotionTokenAddress,
                PromotionToken,
            );
            console.log(`Contract PromotionToken has been updated to address ${config.promotionTokenAddress}`);
            return config.promotionTokenAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );

            const promotionToken = await deployPromotionToken(
                signer,
                adminAddress,
                Initialization.PROMOTION_TOKEN_Name,
                Initialization.PROMOTION_TOKEN_Symbol,
                Initialization.PROMOTION_TOKEN_Fee,
                Initialization.PROMOTION_TOKEN_RoyaltyRate,
            );
            console.log(`Contract PromotionToken has been deployed to address ${promotionToken.address}`);

            return promotionToken.address;
        })();
    console.log(`${networkName}_PROMOTION_TOKEN_ADDRESS=${promotionTokenAddress}`);
}

deployOrUpgradePromotionToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
