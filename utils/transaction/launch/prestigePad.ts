import { MockPrestigePad, PrestigePad, ProxyCaller } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { InitiateLaunchParams, SafeConfirmCurrentRoundParams, SafeFinalizeLaunchParams, ScheduleNextRoundParams, UpdateLaunchURIParams, UpdateRoundParams, UpdateRoundsParams } from "@utils/models/launch/prestigePad";
import { getInitiateLaunchValidation, getUpdateLaunchURIValidation, getUpdateRoundsValidation, getUpdateRoundValidation } from "@utils/validation/launch/prestigePad";
import { ContractTransaction } from "ethers";

export async function getInitiateLaunchTx(
    prestigePad: PrestigePad | MockPrestigePad,
    validator: MockValidator,
    deployer: any,
    params: InitiateLaunchParams
): Promise<ContractTransaction> {
    const validation = await getInitiateLaunchValidation(
        prestigePad,
        validator,
        params
    );

    const tx = prestigePad.connect(deployer).initiateLaunch(
        params.initiator,
        params.zone,
        params.projectURI,
        params.launchURI,
        params.initialQuantity,
        params.feeRate,
        validation,
    );

    return tx;
}

export async function getUpdateRoundTx(
    prestigePad: PrestigePad | MockPrestigePad,
    validator: MockValidator,
    deployer: any,
    params: UpdateRoundParams
): Promise<ContractTransaction> {
    const validation = await getUpdateRoundValidation(prestigePad, validator, params);

    const tx = prestigePad.connect(deployer).updateRound(
        params.launchId,
        params.index,
        {
            ...params.round,
            validation,
        },
    );

    return tx;
}

export async function getUpdateRoundsTx(
    prestigePad: PrestigePad | MockPrestigePad,
    validator: MockValidator,
    deployer: any,
    params: UpdateRoundsParams
): Promise<ContractTransaction> {
    const validations = await getUpdateRoundsValidation(prestigePad, validator, params);
    const roundsWithValidations = params.addedRounds.map((round, index) => ({
        ...round,
        validation: validations[index],
    }));

    const tx = prestigePad.connect(deployer).updateRounds(
        params.launchId,
        params.removedRoundNumber,
        roundsWithValidations,
    );

    return tx;
}

export async function getCallUpdateRoundsTx(
    prestigePad: PrestigePad | MockPrestigePad,
    validator: MockValidator,
    proxyCaller: any,
    params: UpdateRoundsParams
): Promise<ContractTransaction> {
    const validations = await getUpdateRoundsValidation(prestigePad, validator, params);
    const roundsWithValidations = params.addedRounds.map((round, index) => ({
        ...round,
        validation: validations[index],
    }));

    return proxyCaller.call(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData('updateRounds', [
            params.launchId,
            params.removedRoundNumber,
            roundsWithValidations,
        ]),
    );
}

export async function getScheduleNextRoundTx(
    prestigePad: PrestigePad | MockPrestigePad,
    deployer: any,
    params: ScheduleNextRoundParams
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).scheduleNextRound(
        params.launchId,
        params.cashbackThreshold,
        params.cashbackBaseRate,
        params.cashbackCurrencies,
        params.cashbackDenominations,
        params.raiseStartsAt,
        params.raiseDuration,
    );
}

export async function getCallScheduleNextRoundTx(
    prestigePad: PrestigePad | MockPrestigePad,
    proxyCaller: any,
    params: ScheduleNextRoundParams
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
    );
}

export async function getUpdateLaunchURITx(
    prestigePad: PrestigePad | MockPrestigePad,
    validator: MockValidator,
    deployer: any,
    params: UpdateLaunchURIParams
): Promise<ContractTransaction> {
    const validation = await getUpdateLaunchURIValidation(prestigePad, validator, params);

    const tx = prestigePad.connect(deployer).updateLaunchURI(
        params.launchId,
        params.uri,
        validation,
    );

    return tx;
}

export async function getSafeConfirmCurrentRoundTx(
    prestigePad: PrestigePad | MockPrestigePad,
    deployer: any,
    params: SafeConfirmCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = prestigePad.connect(deployer).safeConfirmCurrentRound(
        params.launchId,
        params.anchor,
        txConfig,
    );
    return tx;
}

export async function getCallSafeConfirmCurrentRoundTx(
    prestigePad: PrestigePad | MockPrestigePad,
    proxyCaller: ProxyCaller,
    params: SafeConfirmCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = proxyCaller.call(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData('safeConfirmCurrentRound', [
            params.launchId,
            params.anchor,
        ]),
        txConfig,
    );
    return tx;
}

export async function getSafeFinalizeLaunchTx(
    prestigePad: PrestigePad | MockPrestigePad,
    deployer: any,
    params: SafeFinalizeLaunchParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = prestigePad.connect(deployer).safeFinalize(
        params.launchId,
        params.anchor,
        txConfig,
    );
    return tx;
}
