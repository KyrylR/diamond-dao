// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/Strings.sol";

import "@dlsl/dev-modules/libs/data-structures/StringSet.sol";

import "../interfaces/IDAOIntegration.sol";
import "../interfaces/IPermissionManager.sol";

import "../core/Globals.sol";
import "../core/DAOVault.sol";
import "../core/DAOMemberStorage.sol";
import "../core/RBAC/RBACGroupable.sol";

import "../libs/ArrayHelper.sol";
import "../libs/StringHelper.sol";

/**
 * @title PermissionManager
 * @dev Implementation of contract that manages permissions and roles in a DAO.
 *
 * The contract is based on the RBACGroupable contract.
 * It is the core of whole DAO through which you could permissions to any resources
 * by creating roles, are add specific user to the groups.
 *
 * This module is in developing process and will be improved in the future.
 */
abstract contract PermissionManagerStorage is IPermissionManager, RBACGroupable {
    using ArrayHelper for *;
    using Strings for uint256;

    using StringHelper for string;
    using StringSet for StringSet.Set;

    bytes32 public constant PERMISSION_MANAGER_STORAGE_SLOT =
        keccak256("diamond.standard.permission.manager.storage");

    struct PMStorage {
        string PERMISSION_MANAGER_RESOURCE;
        StringSet.Set vetoGroupTargets;
        // resource => data about guys who could veto on the resource
        mapping(string => VetoGroup) vetoGroups;
    }

    modifier onlyCreatePermission() {
        _requirePermission(CREATE_PERMISSION);
        _;
    }

    modifier onlyAddGroupPermission() {
        _requirePermission(ADD_GROUP_PERMISSION);
        _;
    }

    modifier onlyUpdateGroupPermission() {
        _requirePermission(UPDATE_GROUP_PERMISSION);
        _;
    }

    modifier onlyDeleteGroupPermission() {
        _requirePermission(DELETE_GROUP_PERMISSION);
        _;
    }

    modifier onlyIntegrationPermission() {
        _requirePermission(INTEGRATION_PERMISSION);
        _;
    }

    function getPermissionManagerStorage() internal pure returns (PMStorage storage _pms) {
        bytes32 slot_ = PERMISSION_MANAGER_STORAGE_SLOT;

        assembly {
            _pms.slot := slot_
        }
    }

    /**
     * @dev Gets the accounts who could veto a proposal.
     */
    function getVetoGroupMembers(string memory target_) public view returns (address[] memory) {
        VetoGroup storage vetoGroup_ = getPermissionManagerStorage().vetoGroups[target_];

        if (address(vetoGroup_.linkedMemberStorage) == address(0)) {
            return new address[](0);
        }

        return vetoGroup_.linkedMemberStorage.getMembers();
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function getVetoMembersCount(string memory target_) external view override returns (uint256) {
        return getVetoGroupMembers(target_).length;
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function getVetoGroupInfo(
        string memory target_
    ) external view override returns (VetoGroup memory) {
        return getPermissionManagerStorage().vetoGroups[target_];
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function isVetoGroupExists(string memory target_) external view override returns (bool) {
        return !getPermissionManagerStorage().vetoGroups[target_].target.compare("");
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function getExistingVetoGroupTargets() external view override returns (string[] memory) {
        return getPermissionManagerStorage().vetoGroupTargets.values();
    }

    function _requirePermission(string memory permission_) internal view {
        require(
            hasPermission(
                msg.sender,
                getPermissionManagerStorage().PERMISSION_MANAGER_RESOURCE,
                permission_
            ),
            "PermissionManager: The sender is not allowed to perform the action, access denied."
        );
    }

    function _getResourcesWithPermissionForPanels(
        string memory votingName_,
        string[] memory permissions_,
        string memory panelName_
    ) internal pure returns (IRBAC.ResourceWithPermissions[] memory) {
        string memory daoParameterPanelResource_ = getDAOPanelResource(
            DAO_PARAMETER_STORAGE_NAME,
            panelName_
        );

        string memory daoMemberPanelResource_ = getDAOPanelResource(
            DAO_MEMBER_STORAGE_NAME,
            panelName_
        );

        string memory daoVotingResource_ = getDAOPanelResource(votingName_, panelName_);

        IRBAC.ResourceWithPermissions memory daoParameterStorageResource_ = IRBAC
            .ResourceWithPermissions(daoParameterPanelResource_, permissions_);

        IRBAC.ResourceWithPermissions memory daoMemberStorageResource_ = IRBAC
            .ResourceWithPermissions(daoMemberPanelResource_, permissions_);

        IRBAC.ResourceWithPermissions memory daoVotingRWP_ = IRBAC.ResourceWithPermissions(
            daoVotingResource_,
            permissions_
        );

        return [daoParameterStorageResource_, daoMemberStorageResource_, daoVotingRWP_].asArray();
    }
}
