import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployPromotionToken(
    signer: any,
    adminAddress: string,
    name: string,
    symbol: string,
    fee: BigNumber,
    royaltyRate: BigNumber
) {
    const PromotionToken = await ethers.getContractFactory('PromotionToken', signer);
    const promotionToken = await upgrades.deployProxy(PromotionToken, [adminAddress, name, symbol, fee, royaltyRate]);
    await promotionToken.deployed();
    return promotionToken;
}
