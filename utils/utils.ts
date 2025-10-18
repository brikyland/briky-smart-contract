import { ethers } from 'ethers';

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

export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// get the interface ID of a contract interface
export function getInterfaceID(contractInterface: ethers.utils.Interface, parentInterfaces: ethers.utils.Interface[]) {
    let interfaceID: ethers.BigNumber = ethers.constants.Zero;
    const functions: string[] = Object.keys(contractInterface.functions);
    for (let i = 0; i < functions.length; i++) {
        let isInherited = false;
        for (let j = 0; j < parentInterfaces.length; j++) {
            if (parentInterfaces[j].functions[functions[i]]) {
                isInherited = true;
                break;
            }
        }
        if (!isInherited) {
            interfaceID = interfaceID.xor(contractInterface.getSighash(functions[i]));
        }
    }
    return interfaceID;
}

export function getBytes4Hex(interfaceID: ethers.BigNumber): string {
    const hex = interfaceID.toHexString().slice(0, 10);
    if (hex.length < 10) {
        return '0x' + '0'.repeat(10 - hex.length) + hex.slice(2);
    }
    return hex;
}

// generate a random array of length n whose sum equals to s and each element >= min
// all possible arrays satisfying the condition should be equiprobably generated
export function randomArrayWithSum(
    n: number,
    s: ethers.BigNumber,
    min: ethers.BigNumber = ethers.constants.Zero
): ethers.BigNumber[] {
    if (n <= 0) {
        throw new Error('Length must be positive');
    }
    if (s.lt(0)) {
        throw new Error('Sum must be non-negative');
    }
    if (min.lt(0)) {
        throw new Error('Minimum value must be non-negative');
    }
    if (s.lt(min.mul(n))) {
        throw new Error('Sum too small to satisfy minimum value constraint');
    }
    if (n == 1) {
        return [s];
    }

    // Subtract minimum values first
    const remainingSum = s.sub(min.mul(n));

    // Generate n-1 random points between 0 and remainingSum
    const points: ethers.BigNumber[] = [];
    for (let i = 0; i < n - 1; ++i) {
        points.push(randomBigNumber(ethers.constants.Zero, remainingSum));
    }

    // Sort the points
    points.sort((a, b) => (a.gt(b) ? 1 : -1));

    // Use differences between consecutive points to generate the array
    const result: ethers.BigNumber[] = new Array(n);
    result[0] = points[0].add(min);
    for (let i = 1; i < n - 1; ++i) {
        result[i] = points[i].sub(points[i - 1]).add(min);
    }
    result[n - 1] = remainingSum.sub(points[n - 2]).add(min);

    return result;
}

export class OrderedMap<int, V> {
    private map: Map<int, V>;
    private keys: int[];
    private defaultValue: V;

    constructor(defaultValue: V) {
        this.map = new Map();
        this.keys = [];
        this.defaultValue = defaultValue;
    }

    public get(key: int): V {
        for (let i = this.keys.length - 1; i >= 0; i--) {
            if (this.keys[i] <= key) {
                return this.map.get(this.keys[i])!;
            }
        }
        return this.defaultValue;
    }

    public set(key: int, value: V): void {
        this.map.set(key, value);
        for (let i = 0; i <= this.keys.length; i++) {
            if (i == this.keys.length || this.keys[i] >= key) {
                if (i == this.keys.length || this.keys[i] > key) {
                    this.keys.splice(i, 0, key);
                }
                break;
            }
        }
    }
}

export function shuffle(array: any[]) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {
        // Pick a random remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}

export function replaceFromIndex(str: string, index: number, pattern: string, replacement: string): string {
    return str.slice(0, index) + str.slice(index).replace(pattern, replacement);
}

export function getAddressShortString(address: string): string {
    return address.slice(0, 6) + '...' + address.slice(-4);
}

export function isPureArray(arr: any): boolean {
    const hasObjectProps = Object.keys(arr).some(
        (key) => isNaN(Number(key)) // Any key that isn't a numeric index
    );
    return !hasObjectProps;
}

export function structToObject(struct: any): any {
    if (!struct || typeof struct !== 'object' || struct instanceof ethers.BigNumber) {
        return struct;
    }

    if (struct instanceof Array && isPureArray(struct)) {
        return struct.map((item) => structToObject(item));
    }

    // Only keep named keys, ignore numeric keys
    return Object.fromEntries(
        Object.entries(struct)
            .filter(([key]) => isNaN(Number(key)))
            .map(([key, value]) => [key, structToObject(value)])
    );
}
