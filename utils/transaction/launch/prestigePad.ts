import { Admin, MockPrestigePad, PrestigePad, ProxyCaller } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { CancelCurrentRoundParams, ConfirmCurrentRoundParams, ContributeCurrentRoundParams, FinalizeParams, InitiateLaunchParams, InitiateLaunchParamsInput, SafeConfirmCurrentRoundParams, SafeContributeCurrentRoundParams, SafeFinalizeParams, ScheduleNextRoundParams, UpdateBaseUnitPriceRangeParams, UpdateBaseUnitPriceRangeParamsInput, UpdateLaunchURIParams, UpdateLaunchURIParamsInput, UpdateRoundParams, UpdateRoundParamsInput, UpdateRoundsParams, UpdateRoundsParamsInput, WithdrawContributionParams, WithdrawProjectTokenParams } from "@utils/models/launch/prestigePad";
import { getInitiateLaunchValidation, getUpdateLaunchURIValidation, getUpdateRoundsValidation, getUpdateRoundValidation } from "@utils/validation/launch/prestigePad";
import { ContractTransaction } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getUpdateBaseUnitPriceRangeSignatures } from "@utils/signatures/launch/prestigePad";
import { getSafeConfirmCurrentRoundParams, getSafeContributeCurrentRoundAnchor, getSafeFinalizeParams } from "@utils/anchor/launch/prestigePad";


// updateBaseUnitPriceRange
export async function getUpdateBaseUnitPriceRangeTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: UpdateBaseUnitPriceRangeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).updateBaseUnitPriceRange(
        params.baseMinUnitPrice,
        params.baseMaxUnitPrice,
        params.signatures,
        txConfig,
    );
}

export async function getUpdateBaseUnitPriceRangeTxByInput(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseUnitPriceRangeParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseUnitPriceRangeParams = {
        ...paramsInput,
        signatures: await getUpdateBaseUnitPriceRangeSignatures(prestigePad, paramsInput, admin, admins)
    }
    return await getUpdateBaseUnitPriceRangeTx(prestigePad, deployer, params, txConfig);
}


// initiateLaunch
export async function getInitiateLaunchTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: InitiateLaunchParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).initiateLaunch(
        params.initiator,
        params.zone,
        params.projectURI,
        params.launchURI,
        params.initialQuantity,
        params.feeRate,
        params.validation,
        txConfig,
    );
}

export async function getInitiateLaunchTxByInput(
    prestigePad: PrestigePad,
    validator: MockValidator,
    deployer: SignerWithAddress,
    paramsInput: InitiateLaunchParamsInput,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: InitiateLaunchParams = {
        ...paramsInput,
        validation: await getInitiateLaunchValidation(prestigePad, paramsInput, validator)
    };
    return await getInitiateLaunchTx(prestigePad, deployer, params, txConfig);
};


// updateLaunchURI
export async function getUpdateLaunchURITx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: UpdateLaunchURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).updateLaunchURI(
        params.launchId,
        params.uri,
        params.validation,
        txConfig,
    );
}

export async function getUpdateLaunchURITxByInput(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    paramsInput: UpdateLaunchURIParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateLaunchURIParams = {
        ...paramsInput,
        validation: await getUpdateLaunchURIValidation(prestigePad, paramsInput, validator)
    };
    return getUpdateLaunchURITx(prestigePad, deployer, params, txConfig);
}


// updateRound
export async function getUpdateRoundTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: UpdateRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = prestigePad.connect(deployer).updateRound(
        params.launchId,
        params.index,
        params.round,
        txConfig,
    );
    return tx;
}

export async function getUpdateRoundTxByInput(
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
            validation: await getUpdateRoundValidation(prestigePad, paramsInput, validator)
        },
    };
    return getUpdateRoundTx(prestigePad, deployer, params, txConfig);
}


// updateRounds
export async function getUpdateRoundsTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: UpdateRoundsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).updateRounds(
        params.launchId,
        params.removedRoundNumber,
        params.addedRounds,
    );
}

export async function getCallUpdateRoundsTx(
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
        txConfig,
    );
}

export async function getUpdateRoundsTxByInput(
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
    return getUpdateRoundsTx(prestigePad, deployer, params, txConfig);
}

export async function getCallUpdateRoundsTxByInput(
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
    return getCallUpdateRoundsTx(prestigePad, proxyCaller, params, txConfig);
}


// scheduleNextRound
export async function getScheduleNextRoundTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: ScheduleNextRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).scheduleNextRound(
        params.launchId,
        params.cashbackThreshold,
        params.cashbackBaseRate,
        params.cashbackCurrencies,
        params.cashbackDenominations,
        params.raiseStartsAt,
        params.raiseDuration,
        txConfig,
    );
}

export async function getCallScheduleNextRoundTx(
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
        txConfig,
    );
}


// cancelCurrentRound
export async function getCancelCurrentRoundTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: CancelCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).cancelCurrentRound(
        params.launchId,
        txConfig,
    );
}


// safeConfirmCurrentRound
export async function getSafeConfirmCurrentRoundTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
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

export async function getSafeConfirmCurrentRoundTxByParams(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: ConfirmCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeConfirmCurrentRoundParams = {
        ...params,
        anchor: await getSafeConfirmCurrentRoundParams(prestigePad, params),
    };
    return getSafeConfirmCurrentRoundTx(prestigePad, deployer, safeParams, txConfig);
}

export async function getCallSafeConfirmCurrentRoundTx(
    prestigePad: PrestigePad,
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


// safeFinalize
export async function getSafeFinalizeTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: SafeFinalizeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).safeFinalize(
        params.launchId,
        params.anchor,
        txConfig,
    );
}

export async function getSafeFinalizeTxByParams(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: FinalizeParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeFinalizeParams = {
        ...params,
        anchor: await getSafeFinalizeParams(prestigePad, params),
    };
    return getSafeFinalizeTx(prestigePad, deployer, safeParams, txConfig);
}


// contributeCurrentRound
export async function getContributeCurrentRoundTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: ContributeCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).contributeCurrentRound(
        params.launchId,
        params.quantity,
        txConfig,
    );
}


// safeContributeCurrentRound
export async function getSafeContributeCurrentRoundTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: SafeContributeCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).safeContributeCurrentRound(
        params.launchId,
        params.quantity,
        params.anchor,
        txConfig,
    );
}

export async function getSafeContributeCurrentRoundTxByParams(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: ContributeCurrentRoundParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeContributeCurrentRoundParams = {
        ...params,
        anchor: await getSafeContributeCurrentRoundAnchor(prestigePad, params),
    };
    return getSafeContributeCurrentRoundTx(prestigePad, deployer, safeParams, txConfig);
}


// withdrawContribution
export async function getWithdrawContributionTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: WithdrawContributionParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).withdrawContribution(
        params.roundId,
        txConfig,
    );
}


// withdrawProjectToken
export async function getWithdrawProjectTokenTx(
    prestigePad: PrestigePad,
    deployer: SignerWithAddress,
    params: WithdrawProjectTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return prestigePad.connect(deployer).withdrawProjectToken(
        params.launchId,
        params.index,
        txConfig,
    );
}
