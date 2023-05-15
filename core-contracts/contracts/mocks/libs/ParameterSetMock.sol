// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../../libs/ParameterSet.sol";

contract ParameterSetMock {
    using ParameterSet for ParameterSet.Set;

    ParameterSet.Set internal _set;

    function add(Parameter calldata value_) external {
        _set.add(value_);
    }

    function change(Parameter calldata value_) external {
        _set.change(value_);
    }

    function remove(string memory name_) external {
        _set.remove(name_);
    }

    function contains(string memory name_) external view returns (bool) {
        return _set.contains(name_);
    }

    function length() external view returns (uint256) {
        return _set.length();
    }

    function get(string memory name_) external view returns (Parameter memory) {
        return _set.get(name_);
    }

    function at(uint256 index_) external view returns (Parameter memory) {
        return _set.at(index_);
    }

    function values() external view returns (Parameter[] memory) {
        return _set.values();
    }

    function getSet() external view returns (Parameter[] memory set_) {
        set_ = new Parameter[](_set.length());

        for (uint256 i = 0; i < set_.length; i++) {
            set_[i] = _set.at(i);
        }
    }
}
