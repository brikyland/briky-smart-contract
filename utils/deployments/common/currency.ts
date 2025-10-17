import { ethers, upgrades } from 'hardhat';

export async function deployCurrency(signer: any, name: string, symbol: string) {
    const Currency = await ethers.getContractFactory('Currency', signer);

    const currency = await upgrades.deployProxy(Currency, [name, symbol]);
    await currency.deployed();
    return currency;
}
