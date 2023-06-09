// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/RBAC/IRBAC.sol";

import "./ParameterSet.sol";

/**
 * @title ArrayHelper
 * @dev Library to convert fixed-size arrays (or one element) into dynamic array.
 *
 */
library ArrayHelper {
    function asArray(string memory element_) internal pure returns (string[] memory array_) {
        array_ = new string[](1);
        array_[0] = element_;
    }

    function asArray(string[1] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](1);
        array_[0] = elements_[0];
    }

    function asArray(string[2] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](2);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
    }

    function asArray(string[3] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](3);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
    }

    function asArray(string[4] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](4);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
    }

    function asArray(string[5] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](5);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
    }

    function asArray(string[6] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](6);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
    }

    function asArray(string[7] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](7);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
        array_[6] = elements_[6];
    }

    function asArray(string[8] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](8);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
        array_[6] = elements_[6];
        array_[7] = elements_[7];
    }

    function asArray(string[9] memory elements_) internal pure returns (string[] memory array_) {
        array_ = new string[](9);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
        array_[6] = elements_[6];
        array_[7] = elements_[7];
        array_[8] = elements_[8];
    }

    function asArray(
        IRBAC.ResourceWithPermissions[1] memory elements_
    ) internal pure returns (IRBAC.ResourceWithPermissions[] memory array_) {
        array_ = new IRBAC.ResourceWithPermissions[](1);
        array_[0] = elements_[0];
    }

    function asArray(
        IRBAC.ResourceWithPermissions[2] memory elements_
    ) internal pure returns (IRBAC.ResourceWithPermissions[] memory array_) {
        array_ = new IRBAC.ResourceWithPermissions[](2);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
    }

    function asArray(
        IRBAC.ResourceWithPermissions[3] memory elements_
    ) internal pure returns (IRBAC.ResourceWithPermissions[] memory array_) {
        array_ = new IRBAC.ResourceWithPermissions[](3);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
    }

    function asArray(
        IRBAC.ResourceWithPermissions[4] memory elements_
    ) internal pure returns (IRBAC.ResourceWithPermissions[] memory array_) {
        array_ = new IRBAC.ResourceWithPermissions[](4);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
    }

    function asArray(
        Parameter[1] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](1);
        array_[0] = elements_[0];
    }

    function asArray(
        Parameter[2] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](2);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
    }

    function asArray(
        Parameter[3] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](3);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
    }

    function asArray(
        Parameter[4] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](4);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
    }

    function asArray(
        Parameter[5] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](5);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
    }

    function asArray(
        Parameter[6] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](6);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
    }

    function asArray(
        Parameter[7] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](7);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
        array_[6] = elements_[6];
    }

    function asArray(
        Parameter[8] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](8);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
        array_[6] = elements_[6];
        array_[7] = elements_[7];
    }

    function asArray(
        Parameter[9] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](9);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
        array_[6] = elements_[6];
        array_[7] = elements_[7];
        array_[8] = elements_[8];
    }

    function asArray(
        Parameter[10] memory elements_
    ) internal pure returns (Parameter[] memory array_) {
        array_ = new Parameter[](10);
        array_[0] = elements_[0];
        array_[1] = elements_[1];
        array_[2] = elements_[2];
        array_[3] = elements_[3];
        array_[4] = elements_[4];
        array_[5] = elements_[5];
        array_[6] = elements_[6];
        array_[7] = elements_[7];
        array_[8] = elements_[8];
        array_[9] = elements_[9];
    }
}
