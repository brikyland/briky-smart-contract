import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { EstateLiquidator, EstateToken, GovernanceHub } from '@typechain-types';

// @utils
import { MockValidator } from '@utils/mockValidator';

// @utils/models/land
import {
    ConcludeParams,
    RequestExtractionParams,
    RequestExtractionParamsInput,
} from '@utils/models/land/estateLiquidator';

// @utils/validation/land
import { getRequestExtractionValidation } from '@utils/validation/land/estateLiquidator';

// requestExtraction
export async function getEstateLiquidatorTx_RequestExtraction(
    estateLiquidator: EstateLiquidator,
    signer: SignerWithAddress,
    params: RequestExtractionParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateLiquidator
        .connect(signer)
        .requestExtraction(
            params.estateId,
            params.buyer,
            params.value,
            params.currency,
            params.feeRate,
            params.uuid,
            params.admissionExpiry,
            params.validation,
            txConfig
        );
}

export async function getEstateLiquidatorTxByInput_RequestExtraction(
    estateLiquidator: EstateLiquidator,
    estateToken: EstateToken,
    governanceHub: GovernanceHub,
    validator: MockValidator,
    paramsInput: RequestExtractionParamsInput,
    signer: SignerWithAddress,
    timestamp: number,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RequestExtractionParams = {
        ...paramsInput,
        validation: await getRequestExtractionValidation(
            estateLiquidator as any,
            estateToken as any,
            governanceHub as any,
            paramsInput,
            validator,
            timestamp
        ),
    };
    return await getEstateLiquidatorTx_RequestExtraction(estateLiquidator, signer, params, txConfig);
}

// conclude
export async function getEstateLiquidatorTx_Conclude(
    estateLiquidator: EstateLiquidator,
    signer: SignerWithAddress,
    params: ConcludeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateLiquidator.connect(signer).conclude(params.requestId, txConfig);
}
