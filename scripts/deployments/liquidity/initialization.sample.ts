import { parseEther } from "@utils/blockchain";

// Deployment constants template
export const Initialization = {
    // Primary Token
    PRIMARY_TOKEN_Name: '',
    PRIMARY_TOKEN_Symbol: '',
    PRIMARY_TOKEN_LiquidationUnlockedAt: Date.parse('1970-01-01T00:00:00'),

    // Stake Token
    STAKE_TOKEN_Name_1: '',
    STAKE_TOKEN_Symbol_1: '',
    STAKE_TOKEN_FeeRate_1: parseEther("0"),

    STAKE_TOKEN_Name_2: '',
    STAKE_TOKEN_Symbol_2: '',
    STAKE_TOKEN_FeeRate_2: parseEther("0"),

    STAKE_TOKEN_Name_3: '',
    STAKE_TOKEN_Symbol_3: '',
    STAKE_TOKEN_FeeRate_3: parseEther("0"),
}