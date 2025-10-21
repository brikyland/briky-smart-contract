import { ethers, upgrades } from 'hardhat';

export async function deployProxyCaller(signer: any) {
    const ProxyCaller = await ethers.getContractFactory('ProxyCaller', signer);
    const proxyCaller = await upgrades.deployProxy(ProxyCaller);
    await proxyCaller.deployed();
    return proxyCaller;
}
