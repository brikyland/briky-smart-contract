import { parseEther } from '@utils/blockchain';

export const Initialization = {
    // Primary Token
    PRIMARY_TOKEN_Name: 'Briky Capital',
    PRIMARY_TOKEN_Symbol: 'BRIK',
    PRIMARY_TOKEN_LiquidationUnlockedAt: Date.parse('2026-01-01T00:00:00') / 1000,

    // Stake Token
    STAKE_TOKEN_Name_1: 'Briky Stake 2028',
    STAKE_TOKEN_Symbol_1: 'sBRIK-28',

    STAKE_TOKEN_Name_2: 'Briky Stake 2030',
    STAKE_TOKEN_Symbol_2: 'sBRIK-30',

    STAKE_TOKEN_Name_3: 'Briky Stake 2032',
    STAKE_TOKEN_Symbol_3: 'sBRIK-32',

    STAKE_TOKEN_FeeRate: parseEther('0.001'),
};
