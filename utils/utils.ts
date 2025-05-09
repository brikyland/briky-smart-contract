import { ethers } from "ethers";

export function nextPermutation(nums: number[]): boolean {
    let k = -1;
    // Step 1: Find the largest index k such that nums[k] < nums[k + 1]
    for (let i = nums.length - 2; i >= 0; i--) {
        if (nums[i] < nums[i + 1]) {
            k = i;
            break;
        }
    }

    if (k === -1) {
        // If no such index exists, the permutation is the last permutation
        nums.reverse();
        return false;
    }

    // Step 2: Find the largest index l greater than k such that nums[k] < nums[l]
    let l = -1;
    for (let i = nums.length - 1; i > k; i--) {
        if (nums[i] > nums[k]) {
            l = i;
            break;
        }
    }

    // Step 3: Swap the values of nums[k] and nums[l]
    [nums[k], nums[l]] = [nums[l], nums[k]];

    // Step 4: Reverse the sequence from nums[k + 1] to the end of the array
    let left = k + 1;
    let right = nums.length - 1;
    while (left < right) {
        [nums[left], nums[right]] = [nums[right], nums[left]];
        left++;
        right--;
    }

    return true;
}

// generate a random big number between min (inclusive) and max (inclusive)
// min and max should be int256
export function randomBigNumber(min: ethers.BigNumber, max: ethers.BigNumber): ethers.BigNumber {
    const range = max.sub(min);
    return min.add(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(range.add(1)));
}

// get the interface ID of a contract interface
export function getInterfaceID(contractInterface: ethers.utils.Interface) {
    let interfaceID: ethers.BigNumber = ethers.constants.Zero;
    const functions: string[] = Object.keys(contractInterface.functions);
    for (let i = 0; i < functions.length; i++) {
        interfaceID = interfaceID.xor(contractInterface.getSighash(functions[i]));
    }

    return interfaceID;
}

// generate a random array of length n with sum equal to s and each element >= min
// all possible arrays satisfying the condition should be equiprobably generated
export function randomArrayWithSum(
    n: number,
    s: ethers.BigNumber,
    min: ethers.BigNumber = ethers.constants.Zero,
): ethers.BigNumber[] {
    if (n <= 0) {
        throw new Error("Length must be positive");
    }
    if (s.lt(0)) {
        throw new Error("Sum must be non-negative");
    }
    if (min.lt(0)) {
        throw new Error("Minimum value must be non-negative");
    }
    if (s.lt(min.mul(n))) {
        throw new Error("Sum too small to satisfy minimum value constraint");
    }
    if (n == 1) {
        return [s];
    }

    // Subtract minimum values first
    const remainingSum = s.sub(min.mul(n));

    // Generate n-1 random points between 0 and remainingSum
    const points: ethers.BigNumber[] = [];
    for (let i = 0; i < n - 1; i++) {
        points.push(randomBigNumber(ethers.constants.Zero, remainingSum));
    }

    // Sort the points
    points.sort((a, b) => (a.gt(b) ? 1 : -1));

    // Use differences between consecutive points to generate array
    const result: ethers.BigNumber[] = new Array(n);
    result[0] = points[0].add(min);
    for (let i = 1; i < n - 1; i++) {
        result[i] = points[i].sub(points[i - 1]).add(min);
    }
    result[n - 1] = remainingSum.sub(points[n - 2]).add(min);

    return result;
}
