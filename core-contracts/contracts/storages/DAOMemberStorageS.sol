// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../interfaces/IDAOMemberStorage.sol";

import "../core/PermissionManager.sol";

/**
 * @title DAOMemberStorage Storage
 */
abstract contract DAOMemberStorageS is IDAOMemberStorage {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant DAO_MEMBER_STORAGE_STORAGE_SLOT =
        keccak256("diamond.standard.dao.member.storage.storage");

    struct MSStorage {
        bool initialized;
        string DAO_MEMBER_STORAGE_RESOURCE;
        string targetPanel;
        EnumerableSet.AddressSet members;
        PermissionManager permissionManager;
    }

    function getMSStorage() internal pure returns (MSStorage storage _mss) {
        bytes32 slot_ = DAO_MEMBER_STORAGE_STORAGE_SLOT;

        assembly {
            _mss.slot := slot_
        }
    }

    /**
     * @inheritdoc IDAOMemberStorage
     */
    function isMember(address member_) external view returns (bool) {
        return getMSStorage().members.contains(member_);
    }

    /**
     * @inheritdoc IDAOMemberStorage
     */
    function getMembers() external view returns (address[] memory) {
        return getMSStorage().members.values();
    }

    /**
     * @inheritdoc IDAOMemberStorage
     */
    function getMembersCount() external view override returns (uint256) {
        return getMSStorage().members.length();
    }

    /**
     * @inheritdoc IDAOMemberStorage
     */
    function getGroup() external view override returns (string[] memory) {
        return getDAOExpertGroup(getMSStorage().targetPanel);
    }

    function _requirePermission(string memory permission_) internal view {
        require(
            getMSStorage().permissionManager.hasPermission(
                msg.sender,
                getMSStorage().DAO_MEMBER_STORAGE_RESOURCE,
                permission_
            ),
            "DAOMemberStorage: The sender is not allowed to perform the action, access denied."
        );
    }
}
