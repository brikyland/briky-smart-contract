import { ethers, upgrades } from 'hardhat';
import { BigNumber } from 'ethers';

export async function deployGovernanceHub(signer: any, adminAddress: string, validatorAddress: string, fee: BigNumber) {
    const GovernanceHub = await ethers.getContractFactory('GovernanceHub', signer);
    const governanceHub = await upgrades.deployProxy(GovernanceHub, [adminAddress, validatorAddress, fee]);
    await governanceHub.deployed();
    return governanceHub;
}
