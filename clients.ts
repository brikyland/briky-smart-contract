import {ethers} from "ethers";
// 1. Tạo provider tới RPC local của Hardhat
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");

// 2. Import private key từ hardhat node
const privateKey = "0xf871855f92ac18e4fb6318a083b55ff02e7f0f84f595cb9f2cb5fccc83ad9c52";
const wallet = new ethers.Wallet(privateKey, provider);

// 3. Tạo contract instance
const contractAddress = "0x1275D096B9DBf2347bD2a131Fb6BDaB0B4882487";
const abi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_currency",
                type: "address",
            },
        ],
        name: "getCurrencyRegistry",
        outputs: [
            {
                components: [
                    { internalType: "uint256", name: "minUnitPrice", type: "uint256" },
                    { internalType: "uint256", name: "maxUnitPrice", type: "uint256" },
                    { internalType: "bool", name: "isAvailable", type: "bool" },
                    { internalType: "bool", name: "isExclusive", type: "bool" },
                ],
                internalType: "struct IAdmin.CurrencyRegistry",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
] // ABI của contract

async function main() {
    // Tạo instance contract
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    // Gọi hàm getCurrencyRegistry
    const registry = await contract.getCurrencyRegistry("0x4826533B4897376654Bb4d4AD88B7faFD0C98528");

    console.log("Currency Registry:");
    console.log("minUnitPrice:", registry.minUnitPrice.toString());
    console.log("maxUnitPrice:", registry.maxUnitPrice.toString());
    console.log("isAvailable:", registry.isAvailable);
    console.log("isExclusive:", registry.isExclusive);
}

main().catch(console.error);
