import { EstateToken, MockEstateToken } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { RegisterCustodianParams } from "@utils/models/EstateToken";
import { getRegisterCustodianValidation } from "@utils/validation/EstateToken";
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