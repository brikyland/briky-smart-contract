import { BigNumber, Contract, ethers } from 'ethers';

// @typechain-types
import { Admin } from '@typechain-types';

// @utils
import { Constant } from '@utils/constant';

// @utils/models/common
import { Rate } from '@utils/models/common/common';

export function getStakingFee(
    liquidity: ethers.BigNumber,
    value: ethers.BigNumber,
    totalSupply: ethers.BigNumber,
    feeRate: ethers.BigNumber
): ethers.BigNumber {
    return liquidity.mul(value).div(totalSupply).mul(feeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
}

export function remain(value: ethers.BigNumber, rate: ethers.BigNumber): ethers.BigNumber {
    return value.sub(value.mul(rate).div(Constant.COMMON_RATE_MAX_FRACTION));
}

export function scale(
    value: ethers.BigNumber,
    rate_value: ethers.BigNumberish,
    rate_decimals: number
): ethers.BigNumber {
    return value.mul(rate_value).div(ethers.BigNumber.from(10).pow(rate_decimals));
}

export function scaleRate(value: ethers.BigNumber, Rate: Rate): ethers.BigNumber {
    return value.mul(Rate.value).div(ethers.BigNumber.from(10).pow(Rate.decimals));
}

export async function applyDiscount(admin: Admin, feeAmount: BigNumber, currency: Contract | null) {
    const isExclusive = currency ? await admin.isExclusiveCurrency(currency.address) : false;
    if (isExclusive) {
        const exclusiveRate = currency ? (await currency.exclusiveDiscount()).value : ethers.BigNumber.from(0);
        return remain(feeAmount, exclusiveRate);
    }
    return feeAmount;
}

export async function getCashbackBaseDenomination(
    feeDenomination: BigNumber,
    commissionDenomination: BigNumber,
    cashbackBaseRate: Rate
) {
    return scaleRate(feeDenomination.sub(commissionDenomination), cashbackBaseRate);
}
