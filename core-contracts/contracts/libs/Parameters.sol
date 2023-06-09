// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

enum ParameterType {
    NONE,
    ADDRESS,
    UINT,
    STRING,
    BYTES,
    BOOL
}

struct Parameter {
    string name;
    bytes value;
    ParameterType solidityType;
}

/**
 * @title ParameterCodec
 * @dev Library to encode and decode parameters of different Solidity types.
 */
library ParameterCodec {
    error InvalidParameterType(string name, ParameterType expected, ParameterType actual);

    /**
     * @dev Decodes an address from a Parameter.
     * @param parameter_ The Parameter to decode from.
     * @return The decoded address.
     * @dev Reverts if the Parameter is not of type ADDRESS.
     */
    function decodeAddress(Parameter memory parameter_) internal pure returns (address) {
        _checkType(parameter_, ParameterType.ADDRESS);

        return address(uint160(uint256(bytes32(parameter_.value))));
    }

    /**
     * @dev Decodes a uint256 from a Parameter.
     * @param parameter_ The Parameter to decode from.
     * @return The decoded uint256.
     * @dev Reverts if the Parameter is not of type UINT.
     */
    function decodeUint256(Parameter memory parameter_) internal pure returns (uint256) {
        _checkType(parameter_, ParameterType.UINT);

        return uint256(bytes32(parameter_.value));
    }

    /**
     * @dev Decodes a string from a Parameter.
     * @param parameter_ The Parameter to decode from.
     * @return The decoded string.
     * @dev Reverts if the Parameter is not of type STRING.
     */
    function decodeString(Parameter memory parameter_) internal pure returns (string memory) {
        _checkType(parameter_, ParameterType.STRING);

        return abi.decode(parameter_.value, (string));
    }

    /**
     * @dev Decodes a bytes from a Parameter.
     * @param parameter_ The Parameter to decode from.
     * @return The decoded bytes.
     * @dev Reverts if the Parameter is not of type BYTES32.
     */
    function decodeBytes(Parameter memory parameter_) internal pure returns (bytes memory) {
        _checkType(parameter_, ParameterType.BYTES);

        return parameter_.value;
    }

    /**
     * @dev Decodes a bool from a Parameter.
     * @param parameter_ The Parameter to decode from.
     * @return The decoded bool.
     * @dev Reverts if the Parameter is not of type BOOL.
     */
    function decodeBool(Parameter memory parameter_) internal pure returns (bool) {
        _checkType(parameter_, ParameterType.BOOL);

        return uint256(bytes32(parameter_.value)) == 1;
    }

    /**
     * @dev Encodes a uint256 value into a Parameter.
     * @param value_ The uint256 value to encode.
     * @param name_ The name of the Parameter.
     * @return The encoded Parameter.
     */
    function encodeUint256(
        uint256 value_,
        string memory name_
    ) internal pure returns (Parameter memory) {
        return Parameter(name_, abi.encode(value_), ParameterType.UINT);
    }

    /**
     * @dev Encodes an address value into a Parameter.
     * @param value_ The address value to encode.
     * @param name_ The name of the Parameter.
     * @return The encoded Parameter.
     */
    function encodeAddress(
        address value_,
        string memory name_
    ) internal pure returns (Parameter memory) {
        return Parameter(name_, abi.encode(value_), ParameterType.ADDRESS);
    }

    /**
     * @dev Encodes a string value into a Parameter.
     * @param value_ The string value to encode.
     * @param name_ The name of the Parameter.
     * @return The encoded Parameter.
     */
    function encodeString(
        string memory value_,
        string memory name_
    ) internal pure returns (Parameter memory) {
        return Parameter(name_, abi.encode(value_), ParameterType.STRING);
    }

    /**
     * @dev Encodes a bytes value into a Parameter.
     * @param value_ The bytes value to encode.
     * @param name_ The name of the Parameter.
     * @return The encoded Parameter.
     */
    function encodeBytes(
        bytes memory value_,
        string memory name_
    ) internal pure returns (Parameter memory) {
        return Parameter(name_, value_, ParameterType.BYTES);
    }

    /**
     * @dev Encodes a bool value into a Parameter.
     * @param value_ The bool value to encode.
     * @param name_ The name of the Parameter.
     * @return The encoded Parameter.
     */
    function encodeBool(
        bool value_,
        string memory name_
    ) internal pure returns (Parameter memory) {
        return Parameter(name_, abi.encode((value_ ? 1 : 0)), ParameterType.BOOL);
    }

    function _checkType(Parameter memory parameter_, ParameterType expected_) private pure {
        if (parameter_.solidityType != expected_) {
            revert InvalidParameterType(parameter_.name, expected_, parameter_.solidityType);
        }
    }
}
