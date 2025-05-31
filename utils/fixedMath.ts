import { ethers } from "ethers";

export const FIXED_ONE = ethers.constants.Two.pow(128);

export function toFixed(x: ethers.BigNumber): ethers.BigNumber {
    return x.shl(128);
}

export function toUint(x: ethers.BigNumber): ethers.BigNumber {
    return x.shr(128);
}

export function fixedAdd(a: ethers.BigNumber, b: ethers.BigNumber): ethers.BigNumber {
    return a.add(b);
}

export function fixedSub(a: ethers.BigNumber, b: ethers.BigNumber): ethers.BigNumber {
    return a.sub(b);
}

export function fixedMul(a: ethers.BigNumber, b: ethers.BigNumber): ethers.BigNumber {
    return a.mul(b).div(FIXED_ONE);
}

export function fixedDiv(a: ethers.BigNumber, b: ethers.BigNumber): ethers.BigNumber {
    if (b.isZero()) {
        throw new Error("Division by zero");
    }
    return a.mul(FIXED_ONE).div(b);
}

export function tokenToWeight(token: ethers.BigNumber, interestAccumulation: ethers.BigNumber): ethers.BigNumber {
    return fixedDiv(toFixed(token), interestAccumulation);
}