// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@dlsl/dev-modules/libs/data-structures/PriorityQueue.sol";

/**
 * @title TimeLockHelper
 * @dev Library for managing time-locked assets. Based on the PriorityQueue library.
 *
 * Amount is the priority, while time is the value.
 * With that logic, top function will always return the TimeLock with the biggest amount.
 */
library TimeLockHelper {
    using PriorityQueue for PriorityQueue.UintQueue;

    /**
     * @dev Locks an amount of assets for a specified duration.
     * @param locks_ The priority queue of time locks.
     * @param amount_ The amount of assets to lock.
     * @param timeToLock_ The duration in seconds to lock the assets.
     *
     * Adds a time lock to the priority queue with the specified amount and duration. The priority of the time lock
     * is based on the amount of assets being locked, with higher amounts having higher priority.
     */
    function lock(
        PriorityQueue.UintQueue storage locks_,
        uint256 amount_,
        uint256 timeToLock_
    ) internal {
        locks_.add(timeToLock_, amount_);
    }

    /**
     * @dev Locks an NFT for a specified duration.
     * @param locks_ The priority queue of time locks.
     * @param tokenId_ The ID of the NFT to lock.
     * @param timeToLock_ The duration in seconds to lock the NFT.
     */
    function lockNFT(
        PriorityQueue.UintQueue storage locks_,
        uint256 tokenId_,
        uint256 timeToLock_
    ) internal {
        if (locks_.length() == 0) {
            locks_.add(timeToLock_, tokenId_);
            return;
        }

        if (uint256(locks_._queue._values[0]) < timeToLock_) {
            locks_._queue._values[0] = bytes32(timeToLock_);
        }
    }

    /**
     * @dev Removes all expired time locks.
     * @param locks_ The priority queue of time locks.
     *
     * Iterates over the priority queue from highest priority to lowest priority, removing all time locks whose
     * expiration time is less than the current block timestamp, stopes if the time-lock is still valid.
     */
    function purgeTimeLocks(PriorityQueue.UintQueue storage locks_) internal {
        uint256 currentTimestamp_ = block.timestamp;

        while (locks_.length() > 0 && locks_.topValue() < currentTimestamp_) {
            locks_.removeTop();
        }
    }

    /**
     * This function is used to determine whether an account is able to withdraw a certain amount of
     * assets based on their current balance and the existing time locks on those assets.
     * It iterates through the priority queue of time locks, removing any expired time locks and
     * checking if the account's balance, taking into account the locked assets, is greater than or
     * equal to the amount to be withdrawn. This function modifies the priority queue and is
     * thus a non-view function.
     *
     * @dev Checks if an account is able to withdraw an amount of assets.
     * @param locks_ The priority queue of time locks.
     * @param userBalance_ The account balance.
     * @param amount_ The amount of assets to withdraw.
     * @return bool true if the account is able to withdraw the assets, false otherwise.
     */
    function isAbleToWithdraw(
        PriorityQueue.UintQueue storage locks_,
        uint256 userBalance_,
        uint256 amount_
    ) internal returns (bool) {
        uint256 currentTimestamp_ = block.timestamp;

        while (locks_.length() > 0) {
            (uint256 unlockTime_, uint256 lockedAmount_) = locks_.top();

            if (unlockTime_ < currentTimestamp_) {
                locks_.removeTop();

                continue;
            }

            if (amount_ + lockedAmount_ > userBalance_) {
                return false;
            } else {
                return true;
            }
        }

        return true;
    }

    /**
     * This function is used to determine whether an account is able to withdraw a certain amount of
     * assets based on their current balance and the existing time locks on those assets.
     * It iterates through the priority queue of time locks, checking if the account's balance,
     * taking into account the locked assets, is greater than or equal to the amount to be withdrawn.
     * This function does not modify the priority queue and is thus a view function.
     *
     * @dev Checks if an account is able to withdraw an amount of assets (view function).
     * @param locks_ The priority queue of time locks.
     * @param userBalance_ The account balance.
     * @param amount_ The amount of assets to withdraw.
     * @return bool true if the account is able to withdraw the assets, false otherwise.
     */
    function isAbleToWithdrawView(
        PriorityQueue.UintQueue storage locks_,
        uint256 userBalance_,
        uint256 amount_
    ) internal view returns (bool) {
        (uint256[] memory timeLocks_, uint256[] memory amounts_) = locks_.elements();

        for (uint256 i = 0; i < timeLocks_.length; i++) {
            if (timeLocks_[i] < block.timestamp) {
                continue;
            }

            if (amount_ + amounts_[i] > userBalance_) {
                return false;
            } else {
                return true;
            }
        }

        return true;
    }

    function getWithdrawalAmountAndEndTime(
        PriorityQueue.UintQueue storage locks_,
        uint256 userBalance_
    ) internal view returns (uint256 amount_, uint256 lastEndTime_) {
        (uint256[] memory timeLocks_, uint256[] memory amounts_) = locks_.elements();

        uint256 maxLockAmount_ = 0;
        for (uint256 i = 0; i < timeLocks_.length; i++) {
            if (timeLocks_[i] < block.timestamp) {
                continue;
            }

            if (timeLocks_[i] > lastEndTime_) {
                lastEndTime_ = timeLocks_[i];
            }

            if (amounts_[i] > maxLockAmount_) {
                maxLockAmount_ = amounts_[i];
            }
        }

        if (maxLockAmount_ >= userBalance_) {
            return (0, lastEndTime_);
        } else {
            return (userBalance_ - maxLockAmount_, lastEndTime_);
        }
    }

    /**
     * This function is used to determine whether an NFT can be withdrawn by checking if the NFT is
     * at the top of the priority queue and whether its time lock has expired. If there are no time
     * locks or the NFT is not at the top of the priority queue or its time lock has not expired,
     * this function returns true, indicating that the NFT can be withdrawn.
     *
     * @dev Checks if an account is able to withdraw an NFT.
     * @param locks_ The priority queue of time locks.
     * @param tokenId_ The ID of the NFT to withdraw.
     * @return bool true if the NFT can be withdrawn, false otherwise.
     */
    function isAbleToWithdrawNFT(
        PriorityQueue.UintQueue storage locks_,
        uint256 tokenId_
    ) internal view returns (bool) {
        if (locks_.length() == 0) {
            return true;
        }

        if (uint256(locks_._queue._priorities[0]) != tokenId_) {
            return true;
        }

        if (uint256(locks_._queue._values[0]) < block.timestamp) {
            return true;
        }

        return false;
    }
}
