import { EstateForger, MockEstateForger } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { RequestTokenizationParams, UpdateRequestAgendaParams, UpdateRequestURIParams } from "@utils/models/EstateForger";
import { getRequestTokenizationValidation, getUpdateRequestURIValidation } from "@utils/validation/EstateForger";
import { ContractTransaction } from "ethers";

export async function getRequestTokenizationTx(
    estateForger: EstateForger | MockEstateForger,
    validator: MockValidator,
    deployer: any,
    params: RequestTokenizationParams
): Promise<ContractTransaction> {
    const validation = await getRequestTokenizationValidation(
        estateForger,
        validator,
        params
    );
    const tx = estateForger.connect(deployer).requestTokenization(
        params.requester,
        params.estate,
        params.quota,
        params.quote,
        params.agenda,
        validation,
    );

    return tx;
}

export async function getUpdateRequestURITx(
    estateForger: EstateForger | MockEstateForger,
    validator: MockValidator,
    deployer: any,
    params: UpdateRequestURIParams
): Promise<ContractTransaction> {
    const validation = await getUpdateRequestURIValidation(
        estateForger,
        validator,
        params,
    );
    const tx = estateForger.connect(deployer).updateRequestURI(
        params.requestId,
        params.uri,
        validation,
    );

    return tx;
}

export async function getUpdateRequestAgendaTx(
    estateForger: EstateForger | MockEstateForger,
    deployer: any,
    params: UpdateRequestAgendaParams
): Promise<ContractTransaction> {
    const tx = estateForger.connect(deployer).updateRequestAgenda(
        params.requestId,
        params.agenda,
    );
    return tx;
}