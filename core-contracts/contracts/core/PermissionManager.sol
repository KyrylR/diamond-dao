// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

import "../interfaces/IDAOIntegration.sol";
import "../interfaces/IPermissionManager.sol";

import "../core/Globals.sol";

import "../storages/PermissionManagerStorage.sol";

import "../libs/ArrayHelper.sol";

import "./DAOVault.sol";
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
contract PermissionManager is PermissionManagerStorage {
    using ArrayHelper for *;
    using Strings for uint256;

    using StringHelper for string;
    using StringSet for StringSet.Set;

    /**
     * @notice Initializes the contract.
     * @param master_ the address of the master, who will be able to crate roles and grant permissions to all resources in the DAO.
     */
    function __PermissionManager_init(
        address master_,
        string memory resource_,
        string calldata panelName_
    ) external {
        __RBAC_init();
        _grantRoles(master_, MASTER_ROLE.asArray());
        _grantRoles(address(this), MASTER_ROLE.asArray());

        getPermissionManagerStorage().PERMISSION_MANAGER_RESOURCE = resource_;

        string[] memory memberPermissions_ = [
            CREATE_VOTING_PERMISSION,
            VOTE_FOR_PERMISSION,
            VOTE_PERMISSION
        ].asArray();

        _grantSpecialPermissions(getDAOMemberRole(panelName_)[0], memberPermissions_);

        string[] memory expertPermissions_ = [EXPERT_PERMISSION].asArray();

        _grantSpecialPermissions(getDAOExpertRole(panelName_)[0], expertPermissions_);

        grantGroupRoles(getDAOGroup(DAO_RESERVED_NAME)[0], getDAOMemberRole(panelName_));
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function confExternalModule(
        address moduleToIntegrate_
    ) public override onlyIntegrationPermission {
        (bool success_, bytes memory result_) = moduleToIntegrate_.staticcall(
            abi.encodeWithSignature("getResourceRecords()")
        );

        require(
            success_ && result_.length > 0,
            "PermissionManager: The target contract must follow integration documentation."
        );

        IDAOIntegration.ResourceRecords[] memory records_ = abi.decode(
            result_,
            (IDAOIntegration.ResourceRecords[])
        );

        for (uint256 i = 0; i < records_.length; i++) {
            _addPermissionsToRole(
                records_[i].existingRole,
                records_[i].resource,
                records_[i].permissions,
                true
            );
        }

        emit ExternalModuleIntegrated(moduleToIntegrate_);
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function confVotingModule(
        string memory votingName_,
        address voting_,
        string memory panelName_
    ) external override onlyCreatePermission {
        _confVotingModule(votingName_, voting_, panelName_);
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function confMemberGroup(
        string memory votingName_,
        string memory panelName_
    ) external override onlyCreatePermission {
        _confMemberGroup(votingName_, panelName_);
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function confExpertsGroups(
        string memory votingName_,
        string memory panelName_
    ) external override onlyCreatePermission {
        _confExpertsGroups(votingName_, panelName_);
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function initialConfiguration(
        address voting_,
        string memory votingName_,
        string memory panelName_
    ) external override onlyCreatePermission {
        _confVotingModule(votingName_, voting_, panelName_);
        _confMemberGroup(votingName_, panelName_);
        _confExpertsGroups(votingName_, panelName_);
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function addVetoGroups(VetoGroup[] memory vetoGroups_) external onlyAddGroupPermission {
        for (uint256 i = 0; i < vetoGroups_.length; i++) {
            _addVetoGroup(
                vetoGroups_[i].target,
                vetoGroups_[i].name,
                vetoGroups_[i].linkedMemberStorage
            );
        }
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function addVetoGroup(
        string memory target_,
        string memory name_,
        DAOMemberStorage linkedMemberStorage_
    ) external override onlyAddGroupPermission {
        _addVetoGroup(target_, name_, linkedMemberStorage_);
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function removeVetoGroup(string memory target_) external override onlyDeleteGroupPermission {
        PMStorage storage pms_ = getPermissionManagerStorage();

        VetoGroup storage vetoGroup_ = pms_.vetoGroups[target_];

        require(
            !vetoGroup_.target.compare(""),
            "PermissionManager: The veto group does not exists, impossible to remove it."
        );

        DAOMemberStorage linkedMemberStorage_ = vetoGroup_.linkedMemberStorage;
        if (address(linkedMemberStorage_) != address(0)) {
            revokeGroupRoles(linkedMemberStorage_.getGroup()[0], getVetoGroupRole(target_));
        }

        delete pms_.vetoGroups[target_];

        string[] memory expertPermissions_ = [VETO_FOR_PERMISSION].asArray();

        removePermissionsFromRole(
            getVetoGroupRole(target_)[0],
            [IRBAC.ResourceWithPermissions(target_, expertPermissions_)].asArray(),
            true
        );

        revokeGroupRoles(getVetoGroup(target_)[0], getVetoGroupRole(target_));

        pms_.vetoGroupTargets.remove(target_);

        emit VetoGroupRemoved(target_);
    }

    /**
     * @inheritdoc IPermissionManager
     */
    function linkStorageToVetoGroup(
        string memory target_,
        DAOMemberStorage linkedMemberStorage_
    ) external override onlyUpdateGroupPermission {
        VetoGroup storage vetoGroup_ = getPermissionManagerStorage().vetoGroups[target_];

        require(
            !vetoGroup_.target.compare(""),
            "PermissionManager: The veto group does not exists, impossible to link it with member storage."
        );

        DAOMemberStorage oldLinkedMemberStorage_ = vetoGroup_.linkedMemberStorage;
        if (address(oldLinkedMemberStorage_) != address(0)) {
            revokeGroupRoles(oldLinkedMemberStorage_.getGroup()[0], getVetoGroupRole(target_));
        }

        vetoGroup_.linkedMemberStorage = linkedMemberStorage_;

        if (address(linkedMemberStorage_) != address(0)) {
            grantGroupRoles(linkedMemberStorage_.getGroup()[0], getVetoGroupRole(target_));
        }

        emit LinkedStorageToVetoGroup(target_, address(linkedMemberStorage_));
    }

    function _confVotingModule(
        string memory votingName_,
        address voting_,
        string memory panelName_
    ) internal {
        string[] memory votingContractPermissions_ = [
            CREATE_PERMISSION,
            UPDATE_PERMISSION,
            DELETE_PERMISSION
        ].asArray();

        IRBAC.ResourceWithPermissions[] memory toAdd_ = _getResourcesWithPermissionForPanels(
            votingName_,
            votingContractPermissions_,
            panelName_
        );

        addPermissionsToRole(getDAOVotingRole(panelName_)[0], toAdd_, true);

        addPermissionsToRole(
            getDAOVotingRole(panelName_)[0],
            [IRBAC.ResourceWithPermissions(DAO_VAULT_RESOURCE, [UPDATE_PERMISSION].asArray())]
                .asArray(),
            true
        );

        grantRoles(voting_, getDAOVotingRole(panelName_));
    }

    function _confMemberGroup(string memory votingName_, string memory panelName_) internal {
        string[] memory memberPermissions_ = [
            CREATE_VOTING_PERMISSION,
            VOTE_FOR_PERMISSION,
            VOTE_PERMISSION
        ].asArray();

        IRBAC.ResourceWithPermissions[] memory toAdd_ = _getResourcesWithPermissionForPanels(
            votingName_,
            memberPermissions_,
            panelName_
        );

        addPermissionsToRole(getDAOMemberRole(panelName_)[0], toAdd_, true);

        grantGroupRoles(getDAOGroup(DAO_RESERVED_NAME)[0], getDAOMemberRole(panelName_));
    }

    function _confExpertsGroups(string memory votingName_, string memory panelName_) internal {
        string[] memory expertPermissions_ = [EXPERT_PERMISSION].asArray();

        IRBAC.ResourceWithPermissions[] memory toAdd_ = _getResourcesWithPermissionForPanels(
            votingName_,
            expertPermissions_,
            panelName_
        );

        addPermissionsToRole(getDAOExpertRole(panelName_)[0], toAdd_, true);

        grantGroupRoles(getDAOExpertGroup(panelName_)[0], getDAOExpertRole(panelName_));
    }

    function _addVetoGroup(
        string memory target_,
        string memory name_,
        DAOMemberStorage linkedMemberStorage_
    ) internal {
        VetoGroup storage vetoGroup_ = getPermissionManagerStorage().vetoGroups[target_];

        require(
            vetoGroup_.target.compare(""),
            "PermissionManager: The veto group already exists."
        );

        vetoGroup_.name = name_;
        vetoGroup_.target = target_;
        vetoGroup_.linkedMemberStorage = linkedMemberStorage_;

        string[] memory vetoPermissions_ = [VETO_FOR_PERMISSION].asArray();

        addPermissionsToRole(
            getVetoGroupRole(target_)[0],
            [IRBAC.ResourceWithPermissions(target_, vetoPermissions_)].asArray(),
            true
        );

        grantGroupRoles(getVetoGroup(target_)[0], getVetoGroupRole(target_));

        if (address(linkedMemberStorage_) != address(0)) {
            grantGroupRoles(linkedMemberStorage_.getGroup()[0], getVetoGroupRole(target_));
        }

        getPermissionManagerStorage().vetoGroupTargets.add(target_);

        emit VetoGroupAdded(target_, name_, address(linkedMemberStorage_));
    }

    function _grantSpecialPermissions(string memory role_, string[] memory permissions_) private {
        addPermissionsToRole(
            role_,
            [
                IRBAC.ResourceWithPermissions(
                    getPermissionManagerStorage().PERMISSION_MANAGER_RESOURCE,
                    permissions_
                )
            ].asArray(),
            true
        );
    }
}
