import { parseEther } from '@utils/blockchain';

export const Initialization = {
    // Promotion Token
    PROMOTION_TOKEN_Name: 'Briky Lucra',
    PROMOTION_TOKEN_Symbol: 'LUCKY',
    PROMOTION_TOKEN_Fee: parseEther('3e-10'),
    PROMOTION_TOKEN_RoyaltyRate: parseEther('0.06'),

    // Passport Token
    PASSPORT_TOKEN_Name: 'Briky Passport',
    PASSPORT_TOKEN_Symbol: 'PASSY',
    PASSPORT_TOKEN_BaseURI:
        'https://ipfs.brikyland.com/ipfs/bafkreictdogny4njivduqvg46spds2wl6nd5ygerkbcfcwtg7tzecsfjaq',
    PASSPORT_TOKEN_Fee: parseEther('15e-7'),
    PASSPORT_TOKEN_RoyaltyRate: parseEther('0.06'),
};
