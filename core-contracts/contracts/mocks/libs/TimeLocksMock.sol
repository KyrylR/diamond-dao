// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@dlsl/dev-modules/libs/data-structures/PriorityQueue.sol";

import "../../libs/TimeLocks.sol";

contract TimeLocksMock {
    using PriorityQueue for PriorityQueue.UintQueue;
    using TimeLockHelper for PriorityQueue.UintQueue;

    PriorityQueue.UintQueue internal _locks;

    function lock(uint256 amount_, uint256 timeToLock_) external {
        _locks.lock(amount_, timeToLock_);
    }

    function isAbleToWithdraw(uint256 userBalance_, uint256 amount_) external {
        require(_locks.isAbleToWithdraw(userBalance_, amount_));
    }

    function isAbleToWithdrawView(
        uint256 userBalance_,
        uint256 amount_
    ) external view returns (bool) {
        return _locks.isAbleToWithdrawView(userBalance_, amount_);
    }

    function purgeTimeLocks() external {
        _locks.purgeTimeLocks();
    }

    function add(uint256 value_, uint256 priority_) external {
        _locks.add(priority_, value_);
    }

    function removeTop() external {
        _locks.removeTop();
    }

    function top() external view returns (uint256, uint256) {
        return _locks.top();
    }

    function topValue() external view returns (uint256) {
        return _locks.topValue();
    }

    function length() external view returns (uint256) {
        return _locks.length();
    }

    function elements() external view returns (uint256[] memory, uint256[] memory) {
        return _locks.elements();
    }
}
