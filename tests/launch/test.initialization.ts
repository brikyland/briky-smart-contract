import { parseEther } from '@utils/blockchain';

export const Initialization = {
    // Prestige Pad
    PRESTIGE_PAD_BaseMinUnitPrice: parseEther('100'),
    PRESTIGE_PAD_BaseMaxUnitPrice: parseEther(String(1_000)),

    // Project Token
    PROJECT_TOKEN_BaseURI: 'ProjectToken_BaseURI',
};
