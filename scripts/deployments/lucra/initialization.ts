import { ethers } from "hardhat";

export const Initialization = {
    // Promotion Token
    PROMOTION_TOKEN_Name: 'Briky Lucre',
    PROMOTION_TOKEN_Symbol: 'LUCKY',
    PROMOTION_TOKEN_BaseURI: '',
    PROMOTION_TOKEN_Fee: ethers.utils.parseEther(String(3e-10)),
    PROMOTION_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),

    // Passport Token
    PASSPORT_TOKEN_Name: 'Briky Passport',
    PASSPORT_TOKEN_Symbol: 'PASSY',
    PASSPORT_TOKEN_BaseURI: '',
    PASSPORT_TOKEN_Fee: ethers.utils.parseEther(String(150e-8)),
    PASSPORT_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),
}