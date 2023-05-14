// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title IDAOResource
 * @dev Interface for a contract that is a resource of a DAO.
 *
 * This interface is implemented on the contracts that should be resources on which DAO voting could occur.
 */
interface IDAOResource {
    /**
     * @dev Checks if an account has permission to perform an action on contract that implements this interface.
     * @param member_ The account address to check for permission.
     * @param permission_ The permission to check for.
     * @return true if the account has permission, false otherwise.
     */
    function checkPermission(
        address member_,
        string calldata permission_
    ) external view returns (bool);

    /**
     * @dev Returns the resource name for the contract that implements this interface.
     */
    function getResource() external view returns (string memory);
}
