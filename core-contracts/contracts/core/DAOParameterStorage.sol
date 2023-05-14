// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "@dlsl/dev-modules/contracts-registry/AbstractDependant.sol";

import "../interfaces/IDAOParameterStorage.sol";

import "../core/Globals.sol";

import "../storages/DAOParameterStorageS.sol";

import "./PermissionManager.sol";

/**
 * @title DAOParameterStorage
 * @dev Implementation of contract that stores and manages parameters for a DAO panel.
 *
 * This contract is part of the DAO, which is responsible for storing all parameters that are related to
 * some resource (in this context, it is the name of the panel DAO - resource).
 *
 * For example, it is storing all voting situations with their parameters (voting type, voting duration, etc.).
 */
contract DAOParameterStorage is DAOParameterStorageS {
    using ParameterSet for ParameterSet.Set;

    /**
     * @notice Initializes the contract with resource that contains panel name as part of itself.
     */
    function __DAOParameterStorage_init(string calldata resource_) external {
        PSStorage storage _psStorage = getPSStorage();

        require(!_psStorage.initialized, "DAOParameterStorage: already initialized");

        _psStorage.DAO_PARAMETER_STORAGE_RESOURCE = resource_;

        _psStorage.permissionManager = PermissionManager(address(this));
    }

    /**
     * @inheritdoc IDAOParameterStorage
     */
    function setDAOParameter(
        Parameter calldata parameter_
    ) external override onlyUpdatePermission {
        _setDAOParameter(parameter_);
    }

    /**
     * @inheritdoc IDAOParameterStorage
     */
    function setDAOParameters(
        Parameter[] calldata parameters_
    ) external override onlyUpdatePermission {
        for (uint256 i = 0; i < parameters_.length; i++) {
            _setDAOParameter(parameters_[i]);
        }
    }

    /**
     * @inheritdoc IDAOParameterStorage
     */
    function removeDAOParameter(
        string calldata parameterName_
    ) external override onlyDeletePermission {
        _removeDAOParameter(parameterName_);
    }

    /**
     * @inheritdoc IDAOParameterStorage
     */
    function removeDAOParameters(
        string[] calldata parameterNames_
    ) external override onlyDeletePermission {
        for (uint256 i = 0; i < parameterNames_.length; i++) {
            _removeDAOParameter(parameterNames_[i]);
        }
    }

    function _setDAOParameter(Parameter calldata parameter_) internal virtual {
        PSStorage storage _psStorage = getPSStorage();

        if (_psStorage.parameters.contains(parameter_.name)) {
            _psStorage.parameters.change(parameter_);

            return;
        }

        _psStorage.parameters.add(parameter_);
    }

    function _removeDAOParameter(string calldata parameterName_) internal virtual {
        PSStorage storage _psStorage = getPSStorage();

        if (!_psStorage.parameters.contains(parameterName_)) {
            revert DAOParameterStorage__ParameterNotFound(parameterName_);
        }

        _psStorage.parameters.remove(parameterName_);
    }
}
