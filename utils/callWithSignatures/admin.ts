import { Admin } from "../../typechain-types";
import { ethers } from "hardhat";
import { callTransaction } from "../blockchain";
import { getSignatures } from "../blockchain";
import { BigNumberish } from "ethers";

export async function callAdmin_UpdateCurrencyRegistries(
    admin: Admin,
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

export async function callAdmin_AuthorizeManagers(
    admin: Admin,
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
    admin: Admin,
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


export async function callAdmin_DeclareZones(
    admin: Admin,
    admins: any[],
    zones: string[],
    isZone: boolean,
    nonce: BigNumberish
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32[]", "bool"],
        [admin.address, "declareZones", zones, isZone]
    );
    const signatures = await getSignatures(message, admins, nonce);

    await callTransaction(admin.declareZones(
        zones,
        isZone,
        signatures
    ));
}


export async function callAdmin_ActivateIn(
    admin: Admin,
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

