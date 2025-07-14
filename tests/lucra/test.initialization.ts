import { parseEther } from "@utils/blockchain";

export const Initialization = {
    // Promotion Token
    PROMOTION_TOKEN_Name: 'Briky Lucra',
    PROMOTION_TOKEN_Symbol: 'LUCKY',
    // Testnet
    // PROMOTION_TOKEN_Fee: parseEther(3e-10),
    // Mainnet
    PROMOTION_TOKEN_Fee: parseEther(0.0008),
    PROMOTION_TOKEN_RoyaltyRate: parseEther(0.06),


    // Passport Token
    PASSPORT_TOKEN_Name: 'Briky Passport',
    PASSPORT_TOKEN_Symbol: 'PASSY',
    PASSPORT_TOKEN_BaseURI: 'https://ipfs.brikyland.com/ipfs/bafkreictdogny4njivduqvg46spds2wl6nd5ygerkbcfcwtg7tzecsfjaq',
    // Testnet
    // PASSPORT_TOKEN_Fee: parseEther(150e-8),
    // Mainnet
    PASSPORT_TOKEN_Fee: parseEther(0.016),
    PASSPORT_TOKEN_RoyaltyRate: parseEther(0.06),
}