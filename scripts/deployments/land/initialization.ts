import { network } from 'hardhat';
import { parseEther } from "../../../utils/blockchain";

export const Initialization = {
    // Commission Token
    COMMISSION_TOKEN_Name: 'Briky Commission',
    COMMISSION_TOKEN_Symbol: 'COMIKY',
    COMMISSION_TOKEN_BaseURI: '',
    COMMISSION_TOKEN_CommissionRate: parseEther(0.4),
    COMMISSION_TOKEN_RoyaltyRate: parseEther(0.06),

    // Estate Forger
    ESTATE_FORGER_FeeRate: parseEther(0.001),
    ESTATE_FORGER_BaseMinUnitPrice: parseEther(100),
    ESTATE_FORGER_BaseMaxUnitPrice: parseEther(1_000),

    // Estate Liquidator
    ESTATE_LIQUIDATOR_FeeRate: {
        testnet: parseEther(0.000000001),
        mainnet: parseEther(0),
    }[network.name] || parseEther(0.000000001),

    // Estate Token
    ESTATE_TOKEN_BaseURI: '',
    ESTATE_TOKEN_RoyaltyRate: parseEther(0.0003),

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
}