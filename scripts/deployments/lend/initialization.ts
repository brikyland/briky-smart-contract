import { ethers } from 'hardhat';

export const Initialization = {
    // Mortgage Token
    MORTGAGE_TOKEN_Name: 'Briky Mortgage',
    MORTGAGE_TOKEN_Symbol: 'MORTY',
    MORTGAGE_TOKEN_BaseURI: '',
    MORTGAGE_TOKEN_FeeRate: ethers.utils.parseEther(String(0.02)),
    MORTGAGE_TOKEN_RoyaltyRate: ethers.utils.parseEther(String(0.0003)),

}