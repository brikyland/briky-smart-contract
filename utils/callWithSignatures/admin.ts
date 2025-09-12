import { Admin } from "@typechain-types";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { BigNumberish } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export async function callAdmin_TransferAdministration1(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    admin1: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration1", admin1]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.transferAdministration1(
        admin1,
        signatures
    ));
}

export async function callAdmin_TransferAdministration2(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    admin2: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration2", admin2]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.transferAdministration2(
        admin2,
        signatures
    ));
}

export async function callAdmin_TransferAdministration3(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    admin3: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration3", admin3]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.transferAdministration3(
        admin3,
        signatures
    ));
}

export async function callAdmin_TransferAdministration4(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    admin4: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration4", admin4]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.transferAdministration4(
        admin4,
        signatures
    ));
}

export async function callAdmin_TransferAdministration5(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    admin5: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration5", admin5]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.transferAdministration5(
        admin5,
        signatures
    ));
}

export async function callAdmin_AuthorizeManagers(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    accounts: string[],
    isManager: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeManagers", accounts, isManager]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.authorizeManagers(
        accounts,
        isManager,
        signatures
    ));
}

export async function callAdmin_AuthorizeModerators(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    accounts: string[],
    isModerator: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeModerators", accounts, isModerator]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.authorizeModerators(
        accounts,
        isModerator,
        signatures
    ));
}

export async function callAdmin_AuthorizeGovernor(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    accounts: string[],
    isGovernor: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeGovernor", accounts, isGovernor]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.authorizeGovernor(
        accounts,
        isGovernor,
        signatures
    ));
}

export async function callAdmin_DeclareZone(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    zone: string,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32"],
        [admin.address, "declareZone", zone]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.declareZone(
        zone,
        signatures
    ));
}

export async function callAdmin_ActivateIn(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    zone: string,
    accounts: string[],
    isActive: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32", "address[]", "bool"],
        [admin.address, "activateIn", zone, accounts, isActive]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.activateIn(
        zone,
        accounts,
        isActive,
        signatures
    ));
}

export async function callAdmin_UpdateCurrencyRegistries(
    admin: Admin | MockContract<Admin>,
    admins: any[],
    currencies: string[],
    isAvailable: boolean[],
    isExclusive: boolean[],
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool[]", "bool[]"],
        [admin.address, "updateCurrencyRegistries", currencies, isAvailable, isExclusive]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.updateCurrencyRegistries(
        currencies,
        isAvailable,
        isExclusive,
        signatures
    ));
}