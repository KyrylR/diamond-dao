// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library StringHelper {
    function compare(string memory first_, string memory second_) internal pure returns (bool) {
        if (bytes(first_).length != bytes(second_).length) {
            return false;
        } else {
            return keccak256(abi.encodePacked(first_)) == keccak256(abi.encodePacked(second_));
        }
    }
}
