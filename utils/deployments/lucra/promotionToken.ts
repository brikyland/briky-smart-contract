import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";

export async function deployPromotionToken(
    signer: any,
    adminAddress: string,
    feeReceiverAddress: string,
    name: string,
    symbol: string,
    baseURI: string,
    fee: BigNumber,
    royaltyRate: BigNumber,
) {
    const PromotionToken = await ethers.getContractFactory('PromotionToken', signer);
    const promotionToken = await upgrades.deployProxy(
        PromotionToken,
        [
            adminAddress,
            feeReceiverAddress,
            name,
            symbol,
            baseURI,
            fee,
            royaltyRate,
        ]
    );
    await promotionToken.deployed();
    return promotionToken;
}