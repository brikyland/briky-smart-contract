import {ethers} from "hardhat";

// RPC URL và wallet private key
const RPC_URL = "http://127.0.0.1:8545";
const PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Phải là admin signer hợp lệ

// Contract
const CONTRACT_ADDRESS = "0x2dE080e97B0caE9825375D31f5D0eD5751fDf16D";
const ABI = [
    "function updateCurrencyRegistries() external",
];

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const Admin = await ethers.getContractFactory('Admin')
    const admin = await Admin.attach(CONTRACT_ADDRESS).connect(wallet)
    const nonce = await admin.nonce()
    console.log("NONCE:", nonce);

    // Ví dụ dữ liệu
    const currencies = ["0x381445710b5e73d34aF196c53A3D5cDa58EDBf7A"];
    const isAvailable = [false];
    const isExclusive = [false];

    // ⚠️ Giả lập chữ ký admin (thực tế phải ký đúng data)
    const message = ethers.utils.defaultAbiCoder.encode([
        'address', 'string',
        'address[]', "bool[]", "bool[]"
    ], [
        CONTRACT_ADDRESS, 'updateCurrencyRegistries', currencies, isAvailable, isExclusive
    ])
    let messageHash = ethers.utils.solidityKeccak256(
        ["bytes", "uint256"],
        [message, nonce]
    );

    const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
    const signatures = Array(5).fill(signature)

    // Gửi tx
    const tx = await admin.updateCurrencyRegistries(currencies, isAvailable, isExclusive, signatures);
    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction mined:", receipt.transactionHash);
}

main().catch(console.error);
