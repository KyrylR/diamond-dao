// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../interfaces/IDAOMemberStorage.sol";

import "../storages/DAOMemberStorageS.sol";

import "./PermissionManager.sol";

/**
 * @title DAOMemberStorage
 * @dev The storage contract for the DAO panel members.
 *
 * This contract is part of the DAO, which is responsible for determining the special addresses (experts)
 * which are responsible for some resources (in this context, it is the name of the panel DAO - resource).
 * When a user joins the panel (in the general case, by voting), he will be added to the group
 * associated with the DAO panel (identified by its name).
 */
contract DAOMemberStorage is DAOMemberStorageS {
    using EnumerableSet for EnumerableSet.AddressSet;

    modifier onlyCreatePermission() {
        _requirePermission(CREATE_PERMISSION);
        _;
    }

    modifier onlyDeletePermission() {
        _requirePermission(DELETE_PERMISSION);
        _;
    }

    function __DAOMemberStorage_init(
        string calldata targetPanel_,
        string calldata resource_
    ) external {
        MSStorage storage _mss = getMSStorage();

        require(!_mss.initialized, "DAOMemberStorage: already initialized");

        _mss.initialized = true;

        _mss.DAO_MEMBER_STORAGE_RESOURCE = resource_;

        _mss.targetPanel = targetPanel_;

        _mss.permissionManager = PermissionManager(address(this));
    }

    /**
     * @inheritdoc IDAOMemberStorage
     */
    function addMember(address member_) external override onlyCreatePermission {
        _addMember(member_);
    }

    /**
     * @inheritdoc IDAOMemberStorage
     */
    function addMembers(address[] calldata members_) external override onlyCreatePermission {
        for (uint256 i = 0; i < members_.length; i++) {
            _addMember(members_[i]);
        }
    }

    /**
     * @inheritdoc IDAOMemberStorage
     */
    function removeMember(address member_) external override onlyDeletePermission {
        _removeMember(member_);
    }

    /**
     * @inheritdoc IDAOMemberStorage
     */
    function removeMembers(address[] calldata members_) external override onlyDeletePermission {
        for (uint256 i = 0; i < members_.length; i++) {
            _removeMember(members_[i]);
        }
    }

    function _addMember(address member_) internal {
        MSStorage storage _mss = getMSStorage();

        _mss.members.add(member_);

        _mss.permissionManager.addUserToGroups(member_, getDAOExpertGroup(_mss.targetPanel));
    }

    function _removeMember(address member_) internal {
        MSStorage storage _mss = getMSStorage();

        _mss.members.remove(member_);

        _mss.permissionManager.removeUserFromGroups(member_, getDAOExpertGroup(_mss.targetPanel));
    }
}
