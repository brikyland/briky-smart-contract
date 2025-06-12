import { ethers } from 'hardhat';

export const Initialization = {
    // Commission Token
    COMMISSION_TOKEN_Name: 'Briky Commission',
    COMMISSION_TOKEN_Symbol: 'COMIKY',
    COMMISSION_TOKEN_BaseURI: 'CommissionToken_TestURI',
    COMMISSION_TOKEN_CommissionRate: ethers.utils.parseEther(String(0.4)),
    COMMISSION_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.06)),

    // Estate Forger
    ESTATE_FORGER_FeeRate: ethers.utils.parseEther(String(0.001)),
    ESTATE_FORGER_BaseMinUnitPrice: ethers.utils.parseEther(String(100)),
    ESTATE_FORGER_BaseMaxUnitPrice: ethers.utils.parseEther(String(1_000)),

    // Estate Token
    ESTATE_TOKEN_BaseURI: 'EstateToken_TestURI',
    ESTATE_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.0003)),

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

    STAKE_TOKEN_FeeRate: ethers.utils.parseEther(String(0.001)),
}