// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../libs/ParameterSet.sol";

/**
 * @title IDAOParameterStorage
 * @dev Interface for a contract that stores and manages parameters for a DAO panel.
 */
interface IDAOParameterStorage {
    event ParameterAdded(Parameter parameter);

    event ParameterChanged(Parameter parameter);

    event ParameterRemoved(string parameterName);

    /**
     * @dev Sets a single DAO parameter, changes the existing parameter.
     * @param parameter_ The parameter to set or change
     */
    function setDAOParameter(Parameter calldata parameter_) external;

    /**
     * @dev Sets multiple DAO parameters, changes the existing parameters.
     * @param parameters_ An array of parameters to set or change
     */
    function setDAOParameters(Parameter[] calldata parameters_) external;

    /**
     * @dev Removes a single DAO parameter.
     * @param parameterName_ The name of the parameter to remove.
     */
    function removeDAOParameter(string calldata parameterName_) external;

    /**
     * @dev Removes multiple DAO parameters.
     * @param parameterNames_ An array of parameter names to remove.
     */
    function removeDAOParameters(string[] calldata parameterNames_) external;

    /**
     * @dev Returns a single DAO parameter.
     * @param parameterName_ The name of the parameter to retrieve.
     * @return The specified DAO parameter.
     */
    function getDAOParameter(
        string calldata parameterName_
    ) external view returns (Parameter memory);

    /**
     * @dev Returns all DAO parameters.
     * @return An array of all DAO parameters.
     */
    function getDAOParameters() external view returns (Parameter[] memory);
}
