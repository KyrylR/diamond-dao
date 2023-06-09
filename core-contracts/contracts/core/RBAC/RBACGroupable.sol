// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@dlsl/dev-modules/libs/arrays/SetHelper.sol";
import "@dlsl/dev-modules/libs/data-structures/StringSet.sol";

import "../../interfaces/RBAC/IRBACGroupable.sol";

import "./RBAC.sol";

/**
 *  @notice The Role Based Access Control (RBAC) module modified to work by the Diamond Standard
 *
 * More info: https://github.com/dl-solidity-library/dev-modules/blob/master/contracts/access-control/extensions/RBACGroupable.sol
 */
abstract contract RBACGroupable is IRBACGroupable, RBAC {
    using StringSet for StringSet.Set;
    using SetHelper for StringSet.Set;

    bytes32 public constant RBAC_GROUPABLE_STORAGE_SLOT =
        keccak256("diamond.standard.rbac.groupable.storage");

    struct RBACGroupableStorage {
        mapping(address => StringSet.Set) userGroups;
        mapping(string => StringSet.Set) groupRoles;
    }

    function getRBACGroupableStorage() internal pure returns (RBACGroupableStorage storage _rgs) {
        bytes32 slot_ = RBAC_GROUPABLE_STORAGE_SLOT;

        assembly {
            _rgs.slot := slot_
        }
    }

    /**
     *  @notice The init function
     */
    function __RBACGroupable_init() internal {
        __RBAC_init();
    }

    /**
     *  @notice The function to assign the user to groups
     *  @param who_ the user to be assigned
     *  @param groupsToAddTo_ the list of groups to assign the user to
     */
    function addUserToGroups(
        address who_,
        string[] memory groupsToAddTo_
    ) public virtual override onlyPermission(RBAC_RESOURCE, CREATE_PERMISSION) {
        require(groupsToAddTo_.length > 0, "RBACGroupable: empty groups");

        _addUserToGroups(who_, groupsToAddTo_);
    }

    /**
     *  @notice The function to remove the user from groups
     *  @param who_ the user to be removed from groups
     *  @param groupsToRemoveFrom_ the list of groups to remove the user from
     */
    function removeUserFromGroups(
        address who_,
        string[] memory groupsToRemoveFrom_
    ) public virtual override onlyPermission(RBAC_RESOURCE, DELETE_PERMISSION) {
        require(groupsToRemoveFrom_.length > 0, "RBACGroupable: empty groups");

        _removeUserFromGroups(who_, groupsToRemoveFrom_);
    }

    /**
     *  @notice The function to grant roles to the group
     *  @param groupTo_ the group to grant roles to
     *  @param rolesToGrant_ the list of roles to grant
     */
    function grantGroupRoles(
        string memory groupTo_,
        string[] memory rolesToGrant_
    ) public virtual override onlyPermission(RBAC_RESOURCE, CREATE_PERMISSION) {
        require(rolesToGrant_.length > 0, "RBACGroupable: empty roles");

        _grantGroupRoles(groupTo_, rolesToGrant_);
    }

    /**
     *  @notice The function to revoke roles from the group
     *  @param groupFrom_ the group to revoke roles from
     *  @param rolesToRevoke_ the list of roles to revoke
     */
    function revokeGroupRoles(
        string memory groupFrom_,
        string[] memory rolesToRevoke_
    ) public virtual override onlyPermission(RBAC_RESOURCE, DELETE_PERMISSION) {
        require(rolesToRevoke_.length > 0, "RBACGroupable: empty roles");

        _revokeGroupRoles(groupFrom_, rolesToRevoke_);
    }

    /**
     *  @notice The function to get the list of user groups
     *  @param who_ the user
     *  @return groups_ the list of user groups
     */
    function getUserGroups(address who_) public view override returns (string[] memory groups_) {
        return getRBACGroupableStorage().userGroups[who_].values();
    }

    /**
     *  @notice The function to get the list of groups roles
     *  @param group_ the group
     *  @return roles_ the list of group roles
     */
    function getGroupRoles(
        string memory group_
    ) public view override returns (string[] memory roles_) {
        return getRBACGroupableStorage().groupRoles[group_].values();
    }

    /**
     *  @dev DO NOT call `super.hasPermission(...)` in derived contracts, because this method
     *  handles not 2 but 3 states: NO PERMISSION, ALLOWED, DISALLOWED
     *  @notice The function to check the user's possession of the role. Unlike the base method,
     *  this method also looks up the required permission in the user's groups
     *  @param who_ the user
     *  @param resource_ the resource the user has to have the permission of
     *  @param permission_ the permission the user has to have
     *  @return isAllowed_ true if the user has the permission, false otherwise
     */
    function hasPermission(
        address who_,
        string memory resource_,
        string memory permission_
    ) public view virtual override returns (bool isAllowed_) {
        string[] memory roles_ = getUserRoles(who_);

        for (uint256 i = 0; i < roles_.length; i++) {
            string memory role_ = roles_[i];

            if (_isDisallowed(role_, resource_, permission_)) {
                return false;
            }

            isAllowed_ = isAllowed_ || _isAllowed(role_, resource_, permission_);
        }

        string[] memory groups_ = getUserGroups(who_);

        for (uint256 i = 0; i < groups_.length; i++) {
            roles_ = getGroupRoles(groups_[i]);

            for (uint256 j = 0; j < roles_.length; j++) {
                string memory role_ = roles_[j];

                if (_isDisallowed(role_, resource_, permission_)) {
                    return false;
                }

                isAllowed_ = isAllowed_ || _isAllowed(role_, resource_, permission_);
            }
        }
    }

    /**
     *  @notice The internal function to assign groups to the user
     *  @param who_ the user to assign groups to
     *  @param groupsToAddTo_ the list of groups to be assigned
     */
    function _addUserToGroups(address who_, string[] memory groupsToAddTo_) internal {
        getRBACGroupableStorage().userGroups[who_].add(groupsToAddTo_);

        emit AddedToGroups(who_, groupsToAddTo_);
    }

    /**
     *  @notice The internal function to remove the user from groups
     *  @param who_ the user to be removed from groups
     *  @param groupsToRemoveFrom_ the list of groups to remove the user from
     */
    function _removeUserFromGroups(address who_, string[] memory groupsToRemoveFrom_) internal {
        getRBACGroupableStorage().userGroups[who_].remove(groupsToRemoveFrom_);

        emit RemovedFromGroups(who_, groupsToRemoveFrom_);
    }

    /**
     *  @notice The internal function to grant roles to the group
     *  @param groupTo_ the group to grant roles to
     *  @param rolesToGrant_ the list of roles to grant
     */
    function _grantGroupRoles(string memory groupTo_, string[] memory rolesToGrant_) internal {
        getRBACGroupableStorage().groupRoles[groupTo_].add(rolesToGrant_);

        emit GrantedGroupRoles(groupTo_, rolesToGrant_);
    }

    /**
     *  @notice The internal function to revoke roles from the group
     *  @param groupFrom_ the group to revoke roles from
     *  @param rolesToRevoke_ the list of roles to revoke
     */
    function _revokeGroupRoles(string memory groupFrom_, string[] memory rolesToRevoke_) internal {
        getRBACGroupableStorage().groupRoles[groupFrom_].remove(rolesToRevoke_);

        emit RevokedGroupRoles(groupFrom_, rolesToRevoke_);
    }
}
