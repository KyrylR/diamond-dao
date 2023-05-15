// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@dlsl/dev-modules/libs/data-structures/PriorityQueue.sol";
import "@dlsl/dev-modules/contracts-registry/AbstractDependant.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/IDAOVault.sol";
import "../interfaces/tokens/IERC5484.sol";

import "../core/Globals.sol";
import "../core/PermissionManager.sol";

import "../libs/TimeLocks.sol";
import "../libs/TokenBalance.sol";

/**
 * @title DAOVault Storage
 */
abstract contract DAOVaultStorage is IDAOVault {
    using TokenBalance for address;
    using ERC165Checker for address;

    using EnumerableSet for *;

    using PriorityQueue for PriorityQueue.UintQueue;
    using TimeLockHelper for PriorityQueue.UintQueue;

    bytes32 public constant DAO_VAULT_STORAGE_SLOT =
        keccak256("diamond.standard.dao.vault.storage");

    uint256 public constant MAX_LOCKED_TIME = 365 days;

    struct VaultStorage {
        bool initialized;
        PermissionManager permissionManager;
        // user => token => total voting power
        mapping(address => mapping(address => uint256)) userTokenBalance;
        // user => token => locks
        mapping(address => mapping(address => PriorityQueue.UintQueue)) lockedTokens;
        // token => total supply
        mapping(address => uint256) tokenBalance;
        // user => sum of all tokens
        mapping(address => EnumerableSet.AddressSet) userTokens;
        // user => token => tokenIds
        mapping(address => mapping(address => EnumerableSet.UintSet)) userNFTs;
    }

    modifier onlyUpdatePermission() {
        _requirePermission(UPDATE_PERMISSION);
        _;
    }

    function getVaultStorage() internal pure returns (VaultStorage storage _vs) {
        bytes32 position = DAO_VAULT_STORAGE_SLOT;

        assembly {
            _vs.slot := position
        }
    }

    /**
     * @inheritdoc IDAOVault
     */
    function getTokenSupply(address tokenAddress_) external view override returns (uint256) {
        VaultStorage storage _vs = getVaultStorage();

        if (tokenAddress_ == ETHEREUM_ADDRESS) {
            return _vs.tokenBalance[tokenAddress_];
        }

        return IERC20(tokenAddress_).totalSupply();
    }

    /**
     * @inheritdoc IDAOVault
     */
    function getUserTokenBalance(
        address userAddress_,
        address tokenAddress_
    ) external view returns (uint256) {
        VaultStorage storage _vs = getVaultStorage();

        return _vs.userTokenBalance[userAddress_][tokenAddress_];
    }

    /**
     * @inheritdoc IDAOVault
     */
    function getTokenBalance(address tokenAddress_) external view returns (uint256) {
        VaultStorage storage _vs = getVaultStorage();

        return _vs.tokenBalance[tokenAddress_];
    }

    /**
     * @inheritdoc IDAOVault
     */
    function getUserVotingPower(
        address userAddress_,
        address tokenAddress_
    ) external view override returns (uint256) {
        VaultStorage storage _vs = getVaultStorage();

        if (isSupportedSBT(tokenAddress_)) {
            return IERC721(tokenAddress_).balanceOf(userAddress_) != 0 ? 1 : 0;
        }

        if (isSupportedNFT(tokenAddress_)) {
            return _vs.userNFTs[userAddress_][tokenAddress_].length() > 0 ? 1 : 0;
        }

        return _vs.userTokenBalance[userAddress_][tokenAddress_];
    }

    /**
     * @inheritdoc IDAOVault
     */
    function getUserTokens(
        address userAddress_
    ) external view override returns (address[] memory) {
        return getVaultStorage().userTokens[userAddress_].values();
    }

    /**
     * @inheritdoc IDAOVault
     */
    function getTimeLockInfo(
        address userAddress_,
        address tokenAddress_
    ) external view returns (TomeLockInfo memory info_) {
        VaultStorage storage _vs = getVaultStorage();

        uint256 userTokenBalance_ = _vs.userTokenBalance[userAddress_][tokenAddress_];

        (uint256 amount_, uint256 lastEndTime_) = _vs
        .lockedTokens[userAddress_][tokenAddress_].getWithdrawalAmountAndEndTime(
                userTokenBalance_
            );

        info_.withdrawalAmount = amount_;
        info_.lockedAmount = userTokenBalance_ - amount_;
        info_.unlockTime = lastEndTime_;
    }

    /**
     * @inheritdoc IDAOVault
     */
    function getUserNFTs(
        address userAddress_,
        address tokenAddress_
    ) external view override returns (uint256[] memory) {
        return getVaultStorage().userNFTs[userAddress_][tokenAddress_].values();
    }

    /**
     * @inheritdoc IDAOVault
     */
    function isAuthorizedBySBT(address sender_, address tokenAddress_) public view returns (bool) {
        if (isSupportedSBT(tokenAddress_) && IERC721(tokenAddress_).balanceOf(sender_) != 0) {
            return true;
        }

        return false;
    }

    /**
     * @inheritdoc IDAOVault
     */
    function isSupportedNFT(address tokenAddress_) public view returns (bool) {
        return
            tokenAddress_.supportsInterface(type(IERC721).interfaceId) &&
            tokenAddress_.supportsInterface(type(IERC721Enumerable).interfaceId);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function isSupportedSBT(address tokenAddress_) public view returns (bool) {
        return
            isSupportedNFT(tokenAddress_) &&
            tokenAddress_.supportsInterface(type(IERC5484).interfaceId);
    }

    function _requirePermission(string memory permission_) internal view {
        require(
            getVaultStorage().permissionManager.hasPermission(
                msg.sender,
                DAO_VAULT_RESOURCE,
                permission_
            ),
            "DAOVault: The sender is not allowed to perform the action, access denied."
        );
    }
}
