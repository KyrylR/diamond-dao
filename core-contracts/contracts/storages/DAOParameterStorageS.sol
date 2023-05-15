// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../interfaces/IDAOParameterStorage.sol";

import "../core/Globals.sol";
import "../core/PermissionManager.sol";

/**
 * @title DAOParameterStorage
 * @dev Implementation of contract that stores and manages parameters for a DAO panel.
 *
 * This contract is part of the DAO, which is responsible for storing all parameters that are related to
 * some resource (in this context, it is the name of the panel DAO - resource).
 *
 * For example, it is storing all voting situations with their parameters (voting type, voting duration, etc.).
 */
abstract contract DAOParameterStorageS is IDAOParameterStorage {
    using ParameterSet for ParameterSet.Set;

    error DAOParameterStorage__ParameterNotFound(string parameterName);

    bytes32 public constant DAO_PARAMETER_STORAGE_STORAGE_SLOT =
        keccak256("diamond.standard.dao.parameter.storage.storage");

    struct PSStorage {
        bool initialized;
        string DAO_PARAMETER_STORAGE_RESOURCE;
        VotingType votingType;
        IPermissionManager permissionManager;
        ParameterSet.Set parameters;
    }

    function getPSStorage() internal pure returns (PSStorage storage _pss) {
        bytes32 position = DAO_PARAMETER_STORAGE_STORAGE_SLOT;

        assembly {
            _pss.slot := position
        }
    }

    modifier onlyUpdatePermission() {
        _requirePermission(UPDATE_PERMISSION);
        _;
    }

    modifier onlyDeletePermission() {
        _requirePermission(DELETE_PERMISSION);
        _;
    }

    /**
     * @inheritdoc IDAOParameterStorage
     */
    function getDAOParameter(
        string calldata parameterName_
    ) external view returns (Parameter memory) {
        PSStorage storage _psStorage = getPSStorage();

        if (!_psStorage.parameters.contains(parameterName_)) {
            revert DAOParameterStorage__ParameterNotFound(parameterName_);
        }

        return _psStorage.parameters.get(parameterName_);
    }

    /**
     * @inheritdoc IDAOParameterStorage
     */
    function getDAOParameters() external view returns (Parameter[] memory) {
        return getPSStorage().parameters.values();
    }

    function _requirePermission(string memory permission_) private view {
        require(
            getPSStorage().permissionManager.hasPermission(
                msg.sender,
                getPSStorage().DAO_PARAMETER_STORAGE_RESOURCE,
                permission_
            ),
            "DAOParameterStorage: The sender is not allowed to perform the action, access denied."
        );
    }
}
