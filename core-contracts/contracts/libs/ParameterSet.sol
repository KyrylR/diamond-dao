// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./Parameters.sol";

/**
 *  @notice A library for managing a set of parameters
 */
library ParameterSet {
    struct Set {
        Parameter[] _values;
        mapping(string => uint256) _indexes;
    }

    /**
     *  @notice The function add value to set
     *  @param set the set object
     *  @param parameter_ the parameter to add
     *  @return true if the value was added to the set, that is if it was not
     */
    function add(Set storage set, Parameter calldata parameter_) internal returns (bool) {
        if (!contains(set, parameter_.name)) {
            set._values.push(
                Parameter(parameter_.name, parameter_.value, parameter_.solidityType)
            );
            set._indexes[parameter_.name] = set._values.length;

            return true;
        } else {
            return false;
        }
    }

    /**
     *  @notice The function change value in the set
     *  @param set the set object
     *  @param parameter_ the parameter to change
     *  @return true if the value was changed in the set, that is if it was not
     */
    function change(Set storage set, Parameter calldata parameter_) internal returns (bool) {
        if (contains(set, parameter_.name)) {
            set._values[set._indexes[parameter_.name] - 1] = parameter_;
            return true;
        } else {
            return false;
        }
    }

    /**
     *  @notice The function remove value to set
     *  @param set the set object
     *  @param name_ the name of the parameter to remove
     */
    function remove(Set storage set, string memory name_) internal returns (bool) {
        uint256 valueIndex_ = set._indexes[name_];

        if (valueIndex_ != 0) {
            uint256 toDeleteIndex_ = valueIndex_ - 1;
            uint256 lastIndex_ = set._values.length - 1;

            if (lastIndex_ != toDeleteIndex_) {
                Parameter memory lastvalue_ = set._values[lastIndex_];

                set._values[toDeleteIndex_] = lastvalue_;
                set._indexes[lastvalue_.name] = valueIndex_;
            }

            set._values.pop();

            delete set._indexes[name_];

            return true;
        } else {
            return false;
        }
    }

    /**
     *  @notice The function check if the parameter exists
     *  @param set the set object
     *  @param name_ the name of the parameter to check
     */
    function contains(Set storage set, string memory name_) internal view returns (bool) {
        return set._indexes[name_] != 0;
    }

    /**
     *  @notice The function returns value from set by name
     *  @param set the set object
     *  @param name_ the name of the parameter to get
     *  @return the value at name
     */
    function get(Set storage set, string memory name_) internal view returns (Parameter memory) {
        return set._values[set._indexes[name_] - 1];
    }

    /**
     *  @notice The function returns length of set
     *  @param set the set object
     *  @return the the number of elements in the set
     */
    function length(Set storage set) internal view returns (uint256) {
        return set._values.length;
    }

    /**
     *  @notice The function returns value from set by index
     *  @param set the set object
     *  @param index_ the index of slot in set
     *  @return the value at index
     */
    function at(Set storage set, uint256 index_) internal view returns (Parameter memory) {
        return set._values[index_];
    }

    /**
     *  @notice The function that returns values the set stores, can be very expensive to call
     *  @param set the set object
     *  @return the memory array of values
     */
    function values(Set storage set) internal view returns (Parameter[] memory) {
        return set._values;
    }
}
