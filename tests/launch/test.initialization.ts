import { DAY } from '@tests/test.constant'
import { parseEther } from '@utils/blockchain';

export const Initialization = {
    // Project Token
    PROJECT_TOKEN_Name: 'Briky Launch',
    PROJECT_TOKEN_Symbol: 'LAUNCH',
    PROJECT_TOKEN_BaseURI: 'LaunchToken_TestURI',
    PROJECT_TOKEN_RoyaltyRate: parseEther("0.06"),

    // Prestige Pad
    PRESTIGE_PAD_FeeRate: parseEther("0.001"),
    PRESTIGE_PAD_BaseMinUnitPrice: parseEther("100"),
    PRESTIGE_PAD_BaseMaxUnitPrice: parseEther(String(1_000)),
}