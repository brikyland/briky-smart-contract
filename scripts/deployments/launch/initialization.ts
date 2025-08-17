import { parseEther } from "@utils/blockchain";

export const Initialization = {
    // Prestige Pad
    PRESTIGE_PAD_FeeRate: parseEther("0.001"),
    PRESTIGE_PAD_BaseMinUnitPrice: parseEther("100"),
    PRESTIGE_PAD_BaseMaxUnitPrice: parseEther(String(1_000)),

    // Prestige Token
    PRESTIGE_TOKEN_BaseURI: '',
    PRESTIGE_TOKEN_RoyaltyRate: parseEther("0.0003"),
}
