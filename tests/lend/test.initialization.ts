import { parseEther } from '@utils/blockchain';

export const Initialization = {
    // Mortgage Token
    ESTATE_MORTGAGE_TOKEN_Name: 'Briky Mortgage',
    ESTATE_MORTGAGE_TOKEN_Symbol: 'MORTY',
    ESTATE_MORTGAGE_TOKEN_BaseURI: 'EstateMortgageToken_BaseURI',
    ESTATE_MORTGAGE_TOKEN_FeeRate: parseEther('0.02'),

    // Project Mortgage Token
    PROJECT_MORTGAGE_TOKEN_Name: 'Project Briky Mortgage',
    PROJECT_MORTGAGE_TOKEN_Symbol: 'PMORTY',
    PROJECT_MORTGAGE_TOKEN_BaseURI: 'ProjectMortgageToken_BaseURI',
    PROJECT_MORTGAGE_TOKEN_FeeRate: parseEther('0.02'),

    // ERC721 Mortgage Token
    ERC721_MORTGAGE_TOKEN_Name: 'ERC721 Briky Mortgage',
    ERC721_MORTGAGE_TOKEN_Symbol: 'EMORTY',
    ERC721_MORTGAGE_TOKEN_BaseURI: 'ERC721MortgageToken_BaseURI',
    ERC721_MORTGAGE_TOKEN_FeeRate: parseEther('0.02'),
};
