import { ethers, upgrades } from 'hardhat';

export async function deployERC721Marketplace(signer: any, adminAddress: string, feeReceiverAddress: string) {
    const ERC721Marketplace = await ethers.getContractFactory('ERC721Marketplace', signer);

    const erc721Marketplace = await upgrades.deployProxy(ERC721Marketplace, [adminAddress, feeReceiverAddress]);
    await erc721Marketplace.deployed();
    return erc721Marketplace;
}
