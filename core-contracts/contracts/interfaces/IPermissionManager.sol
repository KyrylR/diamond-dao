// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../core/DAOMemberStorage.sol";

import "./RBAC/IRBAC.sol";
import "./RBAC/IRBACGroupable.sol";

/**
 * @title IPermissionManager
 * @dev Interface for managing permissions and roles in a DAO.
 *
 * This interface provides methods for configuring and managing permissions and roles in a DAO.
 */
interface IPermissionManager is IRBACGroupable, IRBAC {
    /**
     * @dev Struct to pass constructor parameters to the IPermissionManager implementation contract.
     * @param master The address of the DAO master to set as the initial owner.
     */
    struct ConstructorParams {
        address master;
    }

    struct VetoGroup {
        string name;
        string target;
        DAOMemberStorage linkedMemberStorage;
    }

    event VetoGroupAdded(string target, string name, address linkedMemberStorage);

    event VetoGroupRemoved(string target);

    event LinkedStorageToVetoGroup(string target, address linkedMemberStorage);

    event ExternalModuleIntegrated(address module);

    /**
     * @dev It basically calls confVotingModule, confMemberGroup and confExpertsGroups.
     * @param voting_ The main voting address.
     * @param panelName_ The name of the main DAO panel.
     */
    function initialConfiguration(
        address voting_,
        string memory votingName_,
        string memory panelName_
    ) external;

    /**
     * @dev Adds multiple veto groups at once.
     * @param vetoGroups_ An array of `VetoGroupInitializationParams` struct that contains the parameters to initialize the veto groups.
     */
    function addVetoGroups(VetoGroup[] memory vetoGroups_) external;

    /**
     * @dev Adds a veto group.
     * @param target_ The target address that implements IDAOResource.
     * @param name_ The name of the veto group.
     * @param linkedMemberStorage_ The address of the `DAOMemberStorage` contract linked to the veto group.
     */
    function addVetoGroup(
        string memory target_,
        string memory name_,
        DAOMemberStorage linkedMemberStorage_
    ) external;

    /**
     * @dev Removes a veto group.
     * @param target_ The target address of the veto group to remove.
     */
    function removeVetoGroup(string memory target_) external;

    /**
     * @dev Links a `DAOMemberStorage` contract to a veto group.
     * @param target_ The target address of the veto group to link the storage contract to.
     * @param linkedMemberStorage_ The address of the `DAOMemberStorage` contract to link to the veto group.
     */
    function linkStorageToVetoGroup(
        string memory target_,
        DAOMemberStorage linkedMemberStorage_
    ) external;

    /**
     * @dev Gets the number of members in a veto group.
     * @param target_ The target address of the veto group to get the number of members for.
     * @return The number of members in the veto group.
     */
    function getVetoMembersCount(string memory target_) external view returns (uint256);

    /**
     * @dev Gets information about a veto group.
     * @param target_ The target address of the veto group to get information about.
     * @return The target address, name, and the address of the linked `DAOMemberStorage` contract of the veto group.
     */
    function getVetoGroupInfo(string memory target_) external view returns (VetoGroup memory);

    /**
     * @dev Checks if a veto group exists.
     * @param target_ The target address of the veto group to check.
     * @return True if the veto group exists, false otherwise.
     */
    function isVetoGroupExists(string memory target_) external view returns (bool);

    /**
     * @dev Gets the list of all veto groups.
     * @return An array of all veto groups.
     */
    function getExistingVetoGroupTargets() external view returns (string[] memory);

    /**
     * @dev This function is used to configure permissions for external modules.
     * @param moduleToIntegrate_ The address of the module to integrate.
     */
    function confExternalModule(address moduleToIntegrate_) external;

    /**
     * @dev Configures permission for the voting contract.
     * @param voting_ The voting address.
     * @param panelName_ The name of the DAO panel.
     */
    function confVotingModule(
        string memory votingName_,
        address voting_,
        string memory panelName_
    ) external;

    /**
     * @dev Configures permissions for the general DAO member group.
     * @param panelName_ The name of the DAO panel.
     */
    function confMemberGroup(string memory votingName_, string memory panelName_) external;

    /**
     * @dev Configures permissions for the general DAO expert group.
     * @param panelName_ The name of the DAO panel.
     *
     * Permission manager itself is an entry point to the DAO.
     */
    function confExpertsGroups(string memory votingName_, string memory panelName_) external;
}
