import { ethers, upgrades } from "hardhat";

export async function deployPaymentHub(
    signer: any,
    adminAddress: string,
) {
    const PaymentHub = await ethers.getContractFactory('PaymentHub', signer);
    const paymentHub = await upgrades.deployProxy(
        PaymentHub,
        [adminAddress]
    );
    await paymentHub.deployed();
    return paymentHub;
}