// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../../libs/Parameters.sol";
import "../../libs/ParameterSet.sol";

contract ParameterCodecMock {
    using ParameterCodec for *;
    using ParameterSet for ParameterSet.Set;

    ParameterSet.Set internal _set;

    function decodeAddress(Parameter memory parameter_) external pure returns (address) {
        return parameter_.decodeAddress();
    }

    function decodeUint256(Parameter memory parameter_) external pure returns (uint256) {
        return parameter_.decodeUint256();
    }

    function decodeBool(Parameter memory parameter_) external pure returns (bool) {
        return parameter_.decodeBool();
    }

    function decodeBytes(Parameter memory parameter_) external pure returns (bytes memory) {
        return parameter_.decodeBytes();
    }

    function decodeString(Parameter memory parameter_) external pure returns (string memory) {
        return parameter_.decodeString();
    }

    function encodeUint256(
        uint256 value_,
        string calldata name_
    ) external pure returns (Parameter memory) {
        return ParameterCodec.encodeUint256(value_, name_);
    }

    function encodeAddress(
        address value_,
        string calldata name_
    ) external pure returns (Parameter memory) {
        return ParameterCodec.encodeAddress(value_, name_);
    }

    function encodeBool(
        bool value_,
        string calldata name_
    ) external pure returns (Parameter memory) {
        return ParameterCodec.encodeBool(value_, name_);
    }

    function encodeBytes(
        bytes memory value_,
        string calldata name_
    ) external pure returns (Parameter memory) {
        return ParameterCodec.encodeBytes(value_, name_);
    }

    function encodeString(
        string calldata value_,
        string calldata name_
    ) external pure returns (Parameter memory) {
        return ParameterCodec.encodeString(value_, name_);
    }

    function add(Parameter calldata value_) external {
        _set.add(value_);
    }
}
