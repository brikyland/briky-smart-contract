import { ethers, upgrades } from 'hardhat';

export async function deployAdmin(
    signer: any,
    admin1Address: string,
    admin2Address: string,
    admin3Address: string,
    admin4Address: string,
    admin5Address: string
) {
    const Admin = await ethers.getContractFactory('Admin', signer);
    const admin = await upgrades.deployProxy(Admin, [
        admin1Address,
        admin2Address,
        admin3Address,
        admin4Address,
        admin5Address,
    ]);
    await admin.deployed();
    return admin;
}
