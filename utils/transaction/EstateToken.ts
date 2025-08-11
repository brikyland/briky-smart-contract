import { EstateToken, MockEstateToken } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { RegisterCustodianParams, TokenizeEstateParams, UpdateEstateURIParams } from "@utils/models/EstateToken";
import { getRegisterCustodianValidation, getUpdateEstateURIValidation } from "@utils/validation/EstateToken";
import { ContractTransaction } from "ethers";

export async function getRegisterCustodianTx(
    estateToken: EstateToken | MockEstateToken,
    validator: MockValidator,
    deployer: any,
    params: RegisterCustodianParams
): Promise<ContractTransaction> {
    const validation = await getRegisterCustodianValidation(
        estateToken,
        validator,
        params
    );
    const tx = estateToken.connect(deployer).registerCustodian(
        params.zone,
        params.custodian,
        params.uri,
        validation
    );

    return tx;
}

export async function getCallTokenizeEstateTx(
    estateToken: EstateToken | MockEstateToken,
    proxyCaller: any,
    params: TokenizeEstateParams
): Promise<ContractTransaction> {
    const tx = proxyCaller.call(
        estateToken.address,
        estateToken.interface.encodeFunctionData('tokenizeEstate', [
            params.totalSupply,
            params.zone,
            params.tokenizationId,
            params.uri,
            params.expireAt,
            params.custodian,
            params.commissionReceiverAddress,
        ])
    );
    return tx;
}

export async function getUpdateEstateURITx(
    estateToken: EstateToken | MockEstateToken,
    validator: MockValidator,
    deployer: any,
    params: UpdateEstateURIParams
): Promise<ContractTransaction> {
    const validation = await getUpdateEstateURIValidation(
        estateToken,
        validator,
        params
    );
    const tx = estateToken.connect(deployer).updateEstateURI(
        params.estateId,
        params.uri,
        validation
    );

    return tx;
}
