// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../libs/ParameterSet.sol";

/**
 * @title IDAOMemberStorage
 * @dev Interface for a contract that stores and manages members of a DAO panel.
 */
interface IDAOMemberStorage {
    event MemberAdded(address indexed member, string group);

    event MemberRemoved(address indexed member, string group);

    /**
     * @dev Adds a single member to the DAO.
     * @param member_ The address of the member to add.
     *
     * @notice When a member is added to this list, they are considered an Expert and given the ability to
     * veto or participate in restricted voting.
     */
    function addMember(address member_) external;

    /**
     * @dev Adds multiple members to the DAO.
     * @param members_ An array of member addresses to add.
     */
    function addMembers(address[] calldata members_) external;

    /**
     * @dev Removes a single member from the DAO, including automatic removal from the experts group.
     * @param member_ The address of the member to be removed.
     */
    function removeMember(address member_) external;

    /**
     * @dev Removes multiple members from the DAO.
     * @param members_ An array of member addresses to remove.
     */
    function removeMembers(address[] calldata members_) external;

    /**
     * @dev Checks if an address is a member of the DAO.
     * @param member_ The address to check.
     * @return true if the address is a member of the DAO, false otherwise.
     */
    function isMember(address member_) external view returns (bool);

    /**
     * @dev Returns an array of all members of the DAO.
     * @return An array of all members of the DAO.
     */
    function getMembers() external view returns (address[] memory);

    /**
     * @dev Returns the number of members in the DAO.
     * @return The number of members in the DAO.
     */
    function getMembersCount() external view returns (uint256);

    /**
     * @dev Returns to which group this contract belongs.
     */
    function getGroup() external view returns (string[] memory);
}
