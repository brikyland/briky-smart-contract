import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, PrestigePad, ProxyCaller } from '@typechain-types';

// @utils
import { MockValidator } from '@utils/mockValidator';

// @utils/anchor/launch
import {
    getSafeConfirmCurrentRoundAnchor,
    getSafeContributeCurrentRoundAnchor,
    getSafeFinalizeAnchor,
} from '@utils/anchor/launch/prestigePad';

// @utils/models/launch
import {
    CancelCurrentRoundParams,
    ConfirmCurrentRoundParams,
    ContributeCurrentRoundParams,
    FinalizeParams,
    InitiateLaunchParams,
    InitiateLaunchParamsInput,
    SafeConfirmCurrentRoundParams,
    SafeContributeCurrentRoundParams,
    SafeFinalizeParams,
    ScheduleNextRoundParams,
    UpdateBaseUnitPriceRangeParams,
    UpdateBaseUnitPriceRangeParamsInput,
    UpdateLaunchURIParams,
    UpdateLaunchURIParamsInput,
    UpdateRoundParams,
    UpdateRoundParamsInput,
    UpdateRoundsParams,
    UpdateRoundsParamsInput,
    WithdrawContributionParams,
    WithdrawProjectTokenParams,
} from '@utils/models/launch/prestigePad';

// @utils/signatures/launch
import { getUpdateBaseUnitPriceRangeSignatures } from '@utils/signatures/launch/prestigePad';

// @utils/validation/launch
import {
    getInitiateLaunchValidation,
    getUpdateLaunchURIValidation,
    getUpdateRoundsValidation,
    getUpdateRoundValidation,
} from '@utils/validation/launch/prestigePad';

// updateBaseUnitPriceRange
export async function getPrestigePadTx_UpdateBaseUnitPriceRange(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: UpdateBaseUnitPriceRangeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad
        .connect(deployer)
        .updateBaseUnitPriceRange(params.baseMinUnitPrice, params.baseMaxUnitPrice, params.signatures, txConfig);
}

export async function getPrestigePadTxByInput_UpdateBaseUnitPriceRange(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseUnitPriceRangeParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseUnitPriceRangeParams = {
        ...paramsInput,
        signatures: await getUpdateBaseUnitPriceRangeSignatures(prestigePad, paramsInput, admin, admins),
    };
    return await getPrestigePadTx_UpdateBaseUnitPriceRange(prestigePad, deployer, params, txConfig);
}

// initiateLaunch
export async function getPrestigePadTx_InitiateLaunch(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: InitiateLaunchParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad
        .connect(deployer)
        .initiateLaunch(
            params.initiator,
            params.zone,
            params.projectURI,
            params.launchURI,
            params.initialQuantity,
            params.feeRate,
            params.validation,
            txConfig
        );
}

export async function getPrestigePadTxByInput_InitiateLaunch(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    paramsInput: InitiateLaunchParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: InitiateLaunchParams = {
        ...paramsInput,
        validation: await getInitiateLaunchValidation(prestigePad, paramsInput, validator),
    };
    return await getPrestigePadTx_InitiateLaunch(prestigePad, deployer, params, txConfig);
}

// updateLaunchURI
export async function getPrestigePadTx_UpdateLaunchURI(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: UpdateLaunchURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).updateLaunchURI(params.launchId, params.uri, params.validation, txConfig);
}

export async function getPrestigePadTxByInput_UpdateLaunchURI(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    paramsInput: UpdateLaunchURIParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateLaunchURIParams = {
        ...paramsInput,
        validation: await getUpdateLaunchURIValidation(prestigePad, paramsInput, validator),
    };
    return getPrestigePadTx_UpdateLaunchURI(prestigePad, deployer, params, txConfig);
}

// updateRound
export async function getPrestigePadTx_UpdateRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: UpdateRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).updateRound(params.launchId, params.index, params.round, txConfig);
}

export async function getPrestigePadTxByInput_UpdateRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    paramsInput: UpdateRoundParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateRoundParams = {
        ...paramsInput,
        round: {
            ...paramsInput.round,
            validation: await getUpdateRoundValidation(prestigePad, paramsInput, validator),
        },
    };
    return getPrestigePadTx_UpdateRound(prestigePad, deployer, params, txConfig);
}

// updateRounds
export async function getPrestigePadTx_UpdateRounds(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: UpdateRoundsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).updateRounds(params.launchId, params.removedRoundNumber, params.addedRounds, txConfig);
}

export async function getCallPrestigePadTx_UpdateRounds(
    prestigePad: PrestigePad,
    proxyCaller: any,
    params: UpdateRoundsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return proxyCaller.call(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData('updateRounds', [
            params.launchId,
            params.removedRoundNumber,
            params.addedRounds,
        ]),
        txConfig
    );
}

export async function getPrestigePadTxByInput_UpdateRounds(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    paramsInput: UpdateRoundsParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const validations = await getUpdateRoundsValidation(prestigePad, paramsInput, validator);
    const roundsWithValidations = paramsInput.addedRounds.map((round, index) => ({
        ...round,
        validation: validations[index],
    }));
    const params: UpdateRoundsParams = {
        ...paramsInput,
        addedRounds: roundsWithValidations,
    };
    return getPrestigePadTx_UpdateRounds(prestigePad, deployer, params, txConfig);
}

export async function getPrestigePadTxByInput_CallUpdateRounds(
    prestigePad: PrestigePad,
    proxyCaller: any,
    paramsInput: UpdateRoundsParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const validations = await getUpdateRoundsValidation(prestigePad, paramsInput, validator);
    const roundsWithValidations = paramsInput.addedRounds.map((round, index) => ({
        ...round,
        validation: validations[index],
    }));
    const params: UpdateRoundsParams = {
        ...paramsInput,
        addedRounds: roundsWithValidations,
    };
    return getCallPrestigePadTx_UpdateRounds(prestigePad, proxyCaller, params, txConfig);
}

// scheduleNextRound
export async function getPrestigePadTx_ScheduleNextRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: ScheduleNextRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad
        .connect(deployer)
        .scheduleNextRound(
            params.launchId,
            params.cashbackThreshold,
            params.cashbackBaseRate,
            params.cashbackCurrencies,
            params.cashbackDenominations,
            params.raiseStartsAt,
            params.raiseDuration,
            txConfig
        );
}

export async function getCallPrestigePadTx_ScheduleNextRound(
    prestigePad: PrestigePad,
    proxyCaller: any,
    params: ScheduleNextRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return proxyCaller.call(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData('scheduleNextRound', [
            params.launchId,
            params.cashbackThreshold,
            params.cashbackBaseRate,
            params.cashbackCurrencies,
            params.cashbackDenominations,
            params.raiseStartsAt,
            params.raiseDuration,
        ]),
        txConfig
    );
}

// cancelCurrentRound
export async function getPrestigePadTx_CancelCurrentRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: CancelCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).cancelCurrentRound(params.launchId, txConfig);
}

// safeConfirmCurrentRound
export async function getPrestigePadTx_SafeConfirmCurrentRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: SafeConfirmCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).safeConfirmCurrentRound(params.launchId, params.anchor, txConfig);
}

export async function getPrestigePadTxByParams_SafeConfirmCurrentRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: ConfirmCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeConfirmCurrentRoundParams = {
        ...params,
        anchor: await getSafeConfirmCurrentRoundAnchor(prestigePad, params),
    };
    return getPrestigePadTx_SafeConfirmCurrentRound(prestigePad, deployer, safeParams, txConfig);
}

export async function getCallPrestigePadTx_SafeConfirmCurrentRound(
    prestigePad: PrestigePad,
    proxyCaller: ProxyCaller,
    params: SafeConfirmCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return proxyCaller.call(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData('safeConfirmCurrentRound', [params.launchId, params.anchor]),
        txConfig
    );
}

export async function getCallTxByParams_SafeConfirmCurrentRound(
    prestigePad: PrestigePad,
    proxyCaller: ProxyCaller,
    params: ConfirmCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeConfirmCurrentRoundParams = {
        ...params,
        anchor: await getSafeConfirmCurrentRoundAnchor(prestigePad, params),
    };
    return getCallPrestigePadTx_SafeConfirmCurrentRound(prestigePad, proxyCaller, safeParams, txConfig);
}

// safeFinalize
export async function getPrestigePadTx_SafeFinalize(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: SafeFinalizeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).safeFinalize(params.launchId, params.anchor, txConfig);
}

export async function getPrestigePadTxByParams_SafeFinalize(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: FinalizeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeFinalizeParams = {
        ...params,
        anchor: await getSafeFinalizeAnchor(prestigePad, params),
    };
    return getPrestigePadTx_SafeFinalize(prestigePad, deployer, safeParams, txConfig);
}

// contributeCurrentRound
export async function getPrestigePadTx_ContributeCurrentRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: ContributeCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).contributeCurrentRound(params.launchId, params.quantity, txConfig);
}

// safeContributeCurrentRound
export async function getPrestigePadTx_SafeContributeCurrentRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: SafeContributeCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad
        .connect(deployer)
        .safeContributeCurrentRound(params.launchId, params.quantity, params.anchor, txConfig);
}

export async function getPrestigePadTxByParams_SafeContributeCurrentRound(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: ContributeCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeContributeCurrentRoundParams = {
        ...params,
        anchor: await getSafeContributeCurrentRoundAnchor(prestigePad, params),
    };
    return getPrestigePadTx_SafeContributeCurrentRound(prestigePad, deployer, safeParams, txConfig);
}

// withdrawContribution
export async function getPrestigePadTx_WithdrawContribution(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: WithdrawContributionParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).withdrawContribution(params.roundId, txConfig);
}

// withdrawProjectToken
export async function getPrestigePadTx_WithdrawProjectToken(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: WithdrawProjectTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).withdrawProjectToken(params.launchId, params.index, txConfig);
}
