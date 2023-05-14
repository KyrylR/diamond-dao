// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDAOIntegration
 * @dev Interface for DAO Integration
 *
 * This interface is used to integrate other modules with the existing DAO.
 */
interface IDAOIntegration {
    struct ResourceRecords {
        string existingRole;
        string resource;
        string[] permissions;
    }

    /**
     * @dev Function to integrate the module with the DAO.
     */
    function getResourceRecords() external view returns (ResourceRecords[] memory);
}
