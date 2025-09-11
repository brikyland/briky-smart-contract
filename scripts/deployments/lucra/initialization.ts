import { parseEther } from "@utils/blockchain";

// Deployment constants template
export const Initialization = {
    // Promotion Token
    PROMOTION_TOKEN_Name: '',
    PROMOTION_TOKEN_Symbol: '',
    PROMOTION_TOKEN_Fee: parseEther("0"),
    PROMOTION_TOKEN_RoyaltyRate: parseEther("0"),

    // Passport Token
    PASSPORT_TOKEN_Name: '',
    PASSPORT_TOKEN_Symbol: '',
    PASSPORT_TOKEN_BaseURI: '',
    PASSPORT_TOKEN_Fee: parseEther("0"),
    PASSPORT_TOKEN_RoyaltyRate: parseEther("0"),
}