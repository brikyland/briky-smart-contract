import { ethers } from "hardhat";

export const Initialization = {
    // Promotion Token
    PROMOTION_TOKEN_Name: 'Briky Lucra',
    PROMOTION_TOKEN_Symbol: 'LUCKY',
    // Mainnet
    PROMOTION_TOKEN_Fee: ethers.utils.parseEther(String(0.0008)),
    PROMOTION_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),
    // Testnet
    // PROMOTION_TOKEN_Fee: ethers.utils.parseEther(String(3e-10)),
    // PROMOTION_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),

    // Passport Token
    PASSPORT_TOKEN_Name: 'Briky Passport',
    PASSPORT_TOKEN_Symbol: 'PASSY',
    PASSPORT_TOKEN_BaseURI: 'https://ipfs.brikyland.com/ipfs/bafkreictdogny4njivduqvg46spds2wl6nd5ygerkbcfcwtg7tzecsfjaq',
    // Mainnet
    PASSPORT_TOKEN_Fee: ethers.utils.parseEther(String(0.016)),
    PASSPORT_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),
    // Testnet
    // PASSPORT_TOKEN_Fee: ethers.utils.parseEther(String(150e-8)),
    // PASSPORT_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),
}