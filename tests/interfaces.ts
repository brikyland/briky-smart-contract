import {
    IAssetToken__factory,
    ICommon__factory,
    IERC1155MetadataURIUpgradeable__factory,
    IERC1155Upgradeable__factory,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    IEstateTokenizer__factory,
    IEstateTokenReceiver__factory,
    IGovernor__factory,
    IRoyaltyRateProposer__factory,
} from "@typechain-types";

import { getInterfaceID } from "@utils/utils";

/* --- Interfaces --- */
const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
const IERC1155Upgradeable = IERC1155Upgradeable__factory.createInterface();
const IERC1155MetadataURIUpgradeable = IERC1155MetadataURIUpgradeable__factory.createInterface();
const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();

const IAssetToken = IAssetToken__factory.createInterface();
const ICommon = ICommon__factory.createInterface();
const IGovernor = IGovernor__factory.createInterface();
const IRoyaltyRateProposer = IRoyaltyRateProposer__factory.createInterface();

const IEstateTokenizer = IEstateTokenizer__factory.createInterface();
const IEstateTokenReceiver = IEstateTokenReceiver__factory.createInterface();

/* --- Interface IDs --- */
export const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);
export const IERC1155MetadataURIUpgradeableInterfaceId = getInterfaceID(IERC1155MetadataURIUpgradeable, [IERC1155Upgradeable]);
export const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);

export const IAssetTokenInterfaceId = getInterfaceID(IAssetToken, [IERC1155MetadataURIUpgradeable, IERC2981Upgradeable, IGovernor]);
export const IGovernorInterfaceId = getInterfaceID(IGovernor, [IERC1155Upgradeable]);
export const IRoyaltyRateProposerInterfaceId = getInterfaceID(IRoyaltyRateProposer, [ICommon, IERC165Upgradeable, IERC2981Upgradeable]);

export const IEstateTokenizerInterfaceId = getInterfaceID(IEstateTokenizer, [ICommon, IEstateTokenReceiver]);

