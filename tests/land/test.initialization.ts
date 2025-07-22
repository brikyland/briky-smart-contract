import { ethers } from 'hardhat';
import { DAY } from '@tests/test.constant'

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
    ESTATE_FORGER_MinimumSaleDuration: 30 * DAY,
    ESTATE_FORGER_ConfirmationTimeLimit: 30 * DAY,

    // Estate Token
    ESTATE_TOKEN_BaseURI: 'EstateToken_TestURI',
    ESTATE_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.0003)),
}