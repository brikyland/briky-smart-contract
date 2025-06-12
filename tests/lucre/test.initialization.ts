import { ethers } from "hardhat";

export const Initialization = {
    // Promotion Token
    PROMOTION_TOKEN_Name: 'Briky Lucre',
    PROMOTION_TOKEN_Symbol: 'LUCKY',
    PROMOTION_TOKEN_BaseURI: 'PromotionToken_TestURI',
    PROMOTION_TOKEN_Fee: ethers.utils.parseEther(String(3e-10.toFixed(18))),
    PROMOTION_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),

    // Passport Token
    PASSPORT_TOKEN_Name: 'Briky Passport',
    PASSPORT_TOKEN_Symbol: 'PASSY',
    PASSPORT_TOKEN_BaseURI: 'PassportToken_TestURI',
    PASSPORT_TOKEN_Fee: ethers.utils.parseEther(String(150e-10.toFixed(18))),
    PASSPORT_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),
}