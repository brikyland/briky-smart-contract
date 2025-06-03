import { expect } from "chai";
import { ethers } from "ethers";

// expect two big numbers to be equal with a given error margin
export function expectEqualWithErrorMargin(
    expected: ethers.BigNumber,
    actual: ethers.BigNumber,
    errorMargin: ethers.BigNumber = ethers.utils.parseUnits("1", "gwei"),
) {
    expect(expected).to.be.at.least(actual.sub(errorMargin));
    expect(expected).to.be.at.most(actual.add(errorMargin));
}
