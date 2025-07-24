import { network } from "hardhat";
import { parseEther } from "../../../utils/blockchain";

export const Initialization = {
    // Governance Hub
    GOVERNANCE_HUB_Fee: {
        testnet: parseEther("0.000000001"),
        mainnet: parseEther("0"),
    }[network.name] || parseEther("0.000000001"),
}