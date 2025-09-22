import { parseEther } from "@utils/blockchain";

// Deployment constants template
export const Initialization = {
    // Commission Token
    COMMISSION_TOKEN_Name: '',
    COMMISSION_TOKEN_Symbol: '',
    COMMISSION_TOKEN_BaseURI: '',
    COMMISSION_TOKEN_RoyaltyRate: parseEther("0"),

    // Estate Forger
    ESTATE_FORGER_FeeRate: parseEther("0"),
    ESTATE_FORGER_BaseMinUnitPrice: parseEther("0"),
    ESTATE_FORGER_BaseMaxUnitPrice: parseEther("0"),

    // Estate Liquidator
    ESTATE_LIQUIDATOR_FeeRate: parseEther("0"),

    // Estate Token
    ESTATE_TOKEN_BaseURI: '',
    ESTATE_TOKEN_RoyaltyRate: parseEther("0"),
}