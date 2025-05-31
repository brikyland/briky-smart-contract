import { ethers } from "ethers";
import { Constant } from "@utils/constant";

export function getStakingFee(
    liquidity: ethers.BigNumber,
    value: ethers.BigNumber,
    totalSupply: ethers.BigNumber,
    feeRate: ethers.BigNumber
): ethers.BigNumber {
    return liquidity.mul(value).div(totalSupply).mul(feeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
}