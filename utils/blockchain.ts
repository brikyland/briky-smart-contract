import { BigNumberish, ethers, Wallet } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

export function parseEther(x: string) {
    const decimalStr = Number(x).toLocaleString("fullwide", {
        useGrouping: false,
        maximumSignificantDigits: 21,
    });
    return ethers.utils.parseEther(decimalStr);
}

export async function callTransaction(tx: Promise<ethers.ContractTransaction>): Promise<ethers.ContractReceipt> {
    return await ((await tx).wait());
}

export async function callTransactionAtTimestamp(
    tx: Promise<ethers.ContractTransaction>,
    timestamp: number,
): Promise<ethers.ContractReceipt> {
    await time.setNextBlockTimestamp(timestamp);
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
    senders: (ethers.Wallet | ethers.Contract)[],
    amount: ethers.BigNumber
) {
    const deployerBalance = await provider.getBalance(signer.address);
    for (const sender of senders) {
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
            ethers.utils.hexValue(parseEther(String(10_000)))
        ]);
    }
}

export async function prepareERC20(
    token: ethers.Contract,
    senders: (ethers.Wallet | ethers.Contract)[],
    operators: (ethers.Wallet | ethers.Contract)[],
    amount: ethers.BigNumberish
) {
    for (const sender of senders) {
        await callTransaction(token.mint(sender.address, amount));
        for (const operator of operators) {
            try {
                await callTransaction(token.connect(sender as any).increaseAllowance(operator.address, amount));
            } catch (error) {
                await callTransaction(sender.call(
                    token.address,
                    token.interface.encodeFunctionData(
                        'increaseAllowance',
                        [operator.address, amount]
                    )
                ))
            }
        }
    }
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
    callback: any,
) {
    for (const [index, data] of reentrancyData.entries()) {
        await callTransaction(reentrancyContract.updateReentrancyPlan(target.address, data));
        await callback();
    }
}

export function getValidationMessage(
    validatable: ethers.Contract,
    data: string,
    nonce: BigNumberish,
    expiry: BigNumberish,
) {
    return ethers.utils.defaultAbiCoder.encode(
        ["address", "bytes", "uint256", "uint256"],
        [validatable.address, data, nonce, expiry]
    );
}

export async function expectRevertWithModifierCustomError(
    contract: ethers.Contract,
    query: Promise<any>,
    errorName: string,
) {
    try {
        expect(await query).to.revertedWithCustomError(contract, errorName);
    } catch (error: any) {
        const customErrorBytes4 = error.error.data.data;
        const customError = contract.interface.parseError(customErrorBytes4);
        expect(customError.name).to.equal(errorName);
    }
}