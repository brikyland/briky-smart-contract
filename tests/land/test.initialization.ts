import { parseEther } from '@utils/blockchain';

export const Initialization = {
    // Commission Token
    COMMISSION_TOKEN_Name: 'Briky Commission',
    COMMISSION_TOKEN_Symbol: 'COMIKY',
    COMMISSION_TOKEN_BaseURI: 'CommissionToken_TestURI',
    COMMISSION_TOKEN_RoyaltyRate: parseEther('0.06'),

    // Estate Forger
    ESTATE_FORGER_FeeRate: parseEther('0.001'),
    ESTATE_FORGER_BaseMinUnitPrice: parseEther('100'),
    ESTATE_FORGER_BaseMaxUnitPrice: parseEther(String(1_000)),

    // Estate Token
    ESTATE_TOKEN_BaseURI: 'EstateToken_TestURI',
    ESTATE_TOKEN_RoyaltyRate: parseEther('0.0003'),

    // Estate Liquidator
    ESTATE_LIQUIDATOR_FeeRate: parseEther('0.000000001'),
};
