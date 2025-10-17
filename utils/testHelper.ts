import { expect } from 'chai';
import { ethers } from 'ethers';

// expect two big numbers to be equal with a given error margin
export function expectEqualWithErrorMargin(
    expected: ethers.BigNumber,
    actual: ethers.BigNumber,
    errorMargin: ethers.BigNumber = ethers.utils.parseUnits('10', 'wei')
) {
    expect(expected).to.be.at.least(actual.sub(errorMargin));
    expect(expected).to.be.at.most(actual.add(errorMargin));
}

export function expectBetween(value: ethers.BigNumber, lowerbound: ethers.BigNumber, upperbound: ethers.BigNumber) {
    expect(value).to.be.at.least(lowerbound);
    expect(value).to.be.at.most(upperbound);
}
