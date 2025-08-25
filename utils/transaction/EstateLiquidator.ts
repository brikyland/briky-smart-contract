import { BigNumber } from "ethers";
import { Wallet } from "ethers";
import { RequestExtractionParams } from "../models/EstateLiquidator";
import { EstateLiquidator, EstateToken, GovernanceHub } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { getRequestExtractionValidation } from "@utils/validation/EstateLiquidator";

export async function getRequestExtractionTx(
    estateLiquidator: EstateLiquidator,
    estateToken: EstateToken,
    governanceHub: GovernanceHub,
    validator: MockValidator,
    params: RequestExtractionParams,
    signer: Wallet,
    timestamp: number,
    value: BigNumber,
) {
    const validation = await getRequestExtractionValidation(
        estateToken as any,
        estateLiquidator as any,
        governanceHub as any,
        validator,
        timestamp,
        params,
    )

    return await estateLiquidator.connect(signer).requestExtraction(
        params.estateId,
        params.buyer,
        params.value,
        params.currency,
        params.feeRate,
        params.uuid,
        validation,
        { value: value }
    );
}