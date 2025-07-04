import { ethers } from "ethers";
import { Constant } from "@utils/constant";
import { Rate } from "@utils/models/Common";

export function getStakingFee(
    liquidity: ethers.BigNumber,
    value: ethers.BigNumber,
    totalSupply: ethers.BigNumber,
    feeRate: ethers.BigNumber
): ethers.BigNumber {
    return liquidity.mul(value).div(totalSupply).mul(feeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
}

export function remain(
    value: ethers.BigNumber,
    rate: ethers.BigNumber,
): ethers.BigNumber {
    return value.sub(value.mul(rate).div(Constant.COMMON_RATE_MAX_FRACTION));
}

export function getCashbackBaseDenomination(
    unitPrice: ethers.BigNumber,
    commissionRate: ethers.BigNumber,
    cashbackBaseRate: ethers.BigNumber,
): ethers.BigNumber {
    return remain(unitPrice, commissionRate).mul(cashbackBaseRate).div(Constant.COMMON_RATE_MAX_FRACTION);
}

export function scale(
    value: ethers.BigNumber,
    Rate: Rate,
): ethers.BigNumber {
    return value.mul(Rate.value).div(ethers.BigNumber.from(10).pow(Rate.decimals));
}
