import { BigNumberish, ethers, Wallet } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';

export function parseEther(x: number) {
    return ethers.utils.parseEther(x.toFixed(18));
}

export async function callTransaction(tx: Promise<ethers.ContractTransaction>): Promise<ethers.ContractReceipt> {
    return await ((await tx).wait());
}

export async function getSignatures(
    message: string,
    signers: ethers.Wallet[],
    nonce: BigNumberish
): Promise<string[]> {
    const messageHash = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
        ['bytes', 'uint256'],
        [message, nonce]
    ));
    return await Promise.all(signers.map(async (signer) => await signer.signMessage(messageHash)));
}

export function randomWallet(): ethers.Wallet {
    return Wallet.createRandom();
}

export async function isContract(provider: any, address: string) {
    const code = await provider.getCode(address);
    return code != '0x';
}

export async function prepareNativeToken(
    provider: JsonRpcProvider,
    signer: ethers.Wallet,
    sender: ethers.Wallet | ethers.Contract,
    amount: ethers.BigNumber
) {
    const deployerBalance = await provider.getBalance(signer.address);
    await provider.send("hardhat_setBalance", [
        signer.address,
        ethers.utils.hexValue(deployerBalance.add(amount))
    ]);
    await callTransaction(signer.sendTransaction({
        to: sender.address,
        value: amount,
    }));
    await provider.send("hardhat_setBalance", [
        signer.address,
        ethers.utils.hexValue(parseEther(10_000))
    ]);
}

export async function prepareERC20(
    token: ethers.Contract,
    sender: ethers.Wallet,
    operator: ethers.Wallet | ethers.Contract,
    amount: ethers.BigNumberish
) {
    await callTransaction(token.mint(sender.address, amount));
    await callTransaction(token.connect(sender).increaseAllowance(operator.address, amount));
}

export async function resetNativeToken(
    provider: JsonRpcProvider,
    wallets: (ethers.Wallet | ethers.Contract | undefined)[],
) {
    await Promise.all(wallets.map(async (wallet) => {
        if (wallet) {
            await provider.send("hardhat_setBalance", [wallet.address, ethers.utils.hexValue(0)])
        }
    }));
}

export async function resetERC20(
    token: ethers.Contract,
    wallets: (ethers.Wallet | ethers.Contract | undefined)[],
) {
    await Promise.all(wallets.map(async (wallet) => {
        if (wallet) {
            await callTransaction(token.burn(wallet.address, token.balanceOf(wallet.address)))
        }
    }));
}

export async function getBalance(provider: JsonRpcProvider, address: string, currency: ethers.Contract | undefined) {
    if (currency) {
        return await currency.balanceOf(address);
    }
    return await provider.getBalance(address);
}

export function getAddress(wallet: ethers.Wallet | ethers.Contract | undefined) {
    if (!wallet) {
        return ethers.constants.AddressZero;
    }
    return wallet.address;
}

export async function testReentrancy(
    reentrancyContract: ethers.Contract,
    target: ethers.Contract,
    reentrancyData: string[],
    assertion: any,
) {
    for (const data of reentrancyData) {
        await callTransaction(reentrancyContract.updateReentrancyPlan(target.address, data));
        await assertion;
    }
}
