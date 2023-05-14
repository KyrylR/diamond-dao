// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../../libs/StringHelper.sol";

contract StringHelperMock {
    using StringHelper for string;

    function equalStrings() public pure returns (bool) {
        string memory str_ = "test";
        return str_.compare("test");
    }

    function diffStringsWithDiffLength() public pure returns (bool) {
        string memory str_ = "test";
        return str_.compare("test2");
    }

    function diffStringsWithSameLength() public pure returns (bool) {
        string memory str_ = "test3";
        return str_.compare("test2");
    }
}
