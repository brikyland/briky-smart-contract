import {
    IAssetMortgageToken__factory,
    IAssetToken__factory,
    ICommon__factory,
    IERC1155MetadataURIUpgradeable__factory,
    IERC1155ReceiverUpgradeable__factory,
    IERC1155Upgradeable__factory,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    IERC4906Upgradeable__factory,
    IERC721MetadataUpgradeable__factory,
    IERC721Upgradeable__factory,
    IEstateTokenizer__factory,
    IEstateTokenReceiver__factory,
    IGovernor__factory,
    IMortgageToken__factory,
    IProjectLaunchpad__factory,
    IProjectTokenReceiver__factory,
} from '@typechain-types';

import { getInterfaceID } from '@utils/utils';

/* --- Interfaces --- */
const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();
const IERC721MetadataUpgradeable = IERC721MetadataUpgradeable__factory.createInterface();
const IERC1155Upgradeable = IERC1155Upgradeable__factory.createInterface();
const IERC1155ReceiverUpgradeable = IERC1155ReceiverUpgradeable__factory.createInterface();
const IERC1155MetadataURIUpgradeable = IERC1155MetadataURIUpgradeable__factory.createInterface();
const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
const IERC4906Upgradeable = IERC4906Upgradeable__factory.createInterface();

const IAssetMortgageToken = IAssetMortgageToken__factory.createInterface();
const IAssetToken = IAssetToken__factory.createInterface();
const ICommon = ICommon__factory.createInterface();
const IEstateTokenizer = IEstateTokenizer__factory.createInterface();
const IProjectLaunchpad = IProjectLaunchpad__factory.createInterface();
const IEstateTokenReceiver = IEstateTokenReceiver__factory.createInterface();
const IGovernor = IGovernor__factory.createInterface();
const IProjectTokenReceiver = IProjectTokenReceiver__factory.createInterface();
const IMortgageToken = IMortgageToken__factory.createInterface();

/* --- Interface IDs --- */
export const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);
export const IERC721UpgradeableInterfaceId = getInterfaceID(IERC721Upgradeable, [IERC165Upgradeable]);
export const IERC721MetadataUpgradeableInterfaceId = getInterfaceID(IERC721MetadataUpgradeable, [IERC721Upgradeable]);
export const IERC1155UpgradeableInterfaceId = getInterfaceID(IERC1155Upgradeable, [IERC165Upgradeable]);
export const IERC1155MetadataURIUpgradeableInterfaceId = getInterfaceID(IERC1155MetadataURIUpgradeable, [
    IERC1155Upgradeable,
]);
export const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);
export const IERC4906UpgradeableInterfaceId = getInterfaceID(IERC4906Upgradeable, [
    IERC165Upgradeable,
    IERC721Upgradeable,
]);

export const IAssetMortgageTokenInterfaceId = getInterfaceID(IAssetMortgageToken, [
    IMortgageToken,
]);
export const IAssetTokenInterfaceId = getInterfaceID(IAssetToken, [
    IERC1155MetadataURIUpgradeable,
    IERC2981Upgradeable,
    IGovernor,
]);
export const IEstateTokenizerInterfaceId = getInterfaceID(IEstateTokenizer, [ICommon, IEstateTokenReceiver]);
export const IEstateTokenReceiverInterfaceId = getInterfaceID(IEstateTokenReceiver, [IERC1155ReceiverUpgradeable]);
export const IProjectTokenReceiverInterfaceId = getInterfaceID(IProjectTokenReceiver, [IERC1155ReceiverUpgradeable]);
export const IGovernorInterfaceId = getInterfaceID(IGovernor, [IERC1155Upgradeable]);
export const IProjectLaunchpadInterfaceId = getInterfaceID(IProjectLaunchpad, [ICommon, IProjectTokenReceiver]);
export const IMortgageTokenInterfaceId = getInterfaceID(IMortgageToken, [
    ICommon,
    IERC721MetadataUpgradeable,
    IERC2981Upgradeable,
    IERC4906Upgradeable,
]);
