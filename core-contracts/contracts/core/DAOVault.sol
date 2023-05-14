// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@dlsl/dev-modules/libs/data-structures/PriorityQueue.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/IDAOVault.sol";
import "../interfaces/tokens/IERC5484.sol";

import "../core/Globals.sol";

import "./PermissionManager.sol";

import "../libs/TimeLocks.sol";
import "../libs/TokenBalance.sol";
import "../storages/DAOVaultStorage.sol";

/**
 * @title DAOVault
 * @dev This contract stores and manages tokens for a DAO, enabling users to lock ERC20,
 * ERC721, and Native tokens or authorize with SBT to obtain the DAO Token Holder role.
 *
 * To differentiate between ERC20 and Native tokens, the ETHEREUM_ADDRESS is used in depositNative
 * and depositERC20 functions. For NFT operations, separate functions such as lockNFT,
 * depositNFT, and withdrawNFT are provided.
 *
 * The locking mechanism for ERC20 and Native tokens is simple: the voting contract locks all user
 * tokens currently in the Vault for a specified time. Once the lock period ends, users can
 * withdraw their tokens without needing to remove time-locks in a separate transaction.
 *
 * For NFT and SBT, the process is slightly different. Only one of the user's NFTs is locked
 * for a certain period, and SBT is not locked.
 * The DAO Vault contract checks if a user has SBT, and if so, the user is granted
 * the DAO Token Holder role.
 *
 * Users can only withdraw NFTs after the lock period has passed, or revoke the SBT authorization
 * any time (SBT will be still owned by the user).
 */
contract DAOVault is DAOVaultStorage {
    using TokenBalance for address;
    using ERC165Checker for address;

    using EnumerableSet for *;

    using PriorityQueue for PriorityQueue.UintQueue;
    using TimeLockHelper for PriorityQueue.UintQueue;

    receive() external payable {
        _deposit(ETHEREUM_ADDRESS, msg.value);
    }

    /**
     * @notice Initialize the contract
     */
    function __DAOVault_init() external {
        require(!getVaultStorage().initialized, "DAOVault: already initialized");

        getVaultStorage().permissionManager = PermissionManager(address(this));
    }

    /**
     * @inheritdoc IDAOVault
     */
    function depositNative() external payable override {
        _deposit(ETHEREUM_ADDRESS, msg.value);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function depositERC20(address tokenAddress_, uint256 amount_) public override {
        IERC20(tokenAddress_).transferFrom(msg.sender, address(this), amount_);

        _deposit(tokenAddress_, amount_);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function depositNFT(address tokenAddress_, uint256 tokenId_) public override {
        require(isSupportedNFT(tokenAddress_), "DAOVault: The token does not supported.");

        IERC721(tokenAddress_).transferFrom(msg.sender, address(this), tokenId_);

        VaultStorage storage _vs = getVaultStorage();

        _vs.userTokens[msg.sender].add(tokenAddress_);
        _vs.userNFTs[msg.sender][tokenAddress_].add(tokenId_);

        _vs.permissionManager.addUserToGroups(msg.sender, getDAOGroup(DAO_RESERVED_NAME));

        emit DepositedNFT(tokenAddress_, msg.sender, tokenId_);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function authorizeBySBT(address tokenAddress_) external override {
        require(
            isAuthorizedBySBT(msg.sender, tokenAddress_),
            "DAOVault: The user is not authorized or token does not supported."
        );

        VaultStorage storage _vs = getVaultStorage();

        _vs.userTokens[msg.sender].add(tokenAddress_);

        _vs.permissionManager.addUserToGroups(msg.sender, getDAOGroup(DAO_RESERVED_NAME));

        emit AuthorizedBySBT(tokenAddress_, msg.sender);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function lock(
        address sender_,
        address tokenAddress_,
        uint256 amount_,
        uint256 timeToLock_
    ) external override onlyUpdatePermission {
        require(
            timeToLock_ <= MAX_LOCKED_TIME + block.timestamp,
            "DAOVault: The lock time is too big."
        );

        if (isSupportedSBT(tokenAddress_)) {
            _SBTAuthorization(sender_, tokenAddress_);

            emit AuthenticationBySBT(tokenAddress_, sender_, timeToLock_);

            return;
        }

        if (isSupportedNFT(tokenAddress_)) {
            _lockNFT(sender_, tokenAddress_, timeToLock_);

            return;
        }

        require(amount_ > 0, "DAOVault: The amount to lock should be more than 0.");

        _lockToken(sender_, tokenAddress_, amount_, timeToLock_);

        emit Locked(tokenAddress_, sender_, amount_, timeToLock_);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function withdrawNative(uint256 amount_) external override {
        _withdraw(ETHEREUM_ADDRESS, amount_);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function withdrawERC20(address tokenAddress_, uint256 amount_) external override {
        _withdraw(tokenAddress_, amount_);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function withdrawNFT(address tokenAddress_, uint256 tokenId_) external override {
        VaultStorage storage _vs = getVaultStorage();

        require(
            _vs.lockedTokens[msg.sender][tokenAddress_].isAbleToWithdrawNFT(tokenId_),
            "DAOVault: Trying to withdraw locked NFT."
        );

        uint256 userTokenId_ = _vs.userNFTs[msg.sender][tokenAddress_].at(0);

        _vs.userNFTs[msg.sender][tokenAddress_].remove(userTokenId_);

        if (_vs.userNFTs[msg.sender][tokenAddress_].length() == 0) {
            _removeTokenFromUser(tokenAddress_);
        }

        IERC721(tokenAddress_).transferFrom(address(this), msg.sender, userTokenId_);

        emit WithdrewNFT(tokenAddress_, msg.sender, tokenId_);
    }

    /**
     * @inheritdoc IDAOVault
     */
    function revokeSBTAuthorization(address tokenAddress_) external override {
        require(
            isAuthorizedBySBT(msg.sender, tokenAddress_),
            "DAOVault: The user is not authorized or token does not supported."
        );

        _removeTokenFromUser(tokenAddress_);

        emit RevokedSBTAuthorization(tokenAddress_, msg.sender);
    }

    function _deposit(address tokenAddress_, uint256 amount_) internal {
        VaultStorage storage _vs = getVaultStorage();

        _vs.userTokens[msg.sender].add(tokenAddress_);

        _vs.userTokenBalance[msg.sender][tokenAddress_] += amount_;
        _vs.tokenBalance[tokenAddress_] += amount_;

        _vs.permissionManager.addUserToGroups(msg.sender, getDAOGroup(DAO_RESERVED_NAME));

        _vs.lockedTokens[msg.sender][tokenAddress_].purgeTimeLocks();

        emit Deposited(tokenAddress_, msg.sender, amount_);
    }

    function _SBTAuthorization(address sender_, address tokenAddress_) internal {
        bool isUserHasSBT_ = IERC721(tokenAddress_).balanceOf(sender_) != 0;
        bool isUserHasSBTInVault_ = getVaultStorage().userTokens[sender_].contains(tokenAddress_);

        if (isUserHasSBT_ && isUserHasSBTInVault_) {
            return;
        }

        if (!isUserHasSBT_) {
            revert("DAOVault: The user does not have the SBT token.");
        }

        getVaultStorage().userTokens[sender_].add(tokenAddress_);
    }

    function _lockToken(
        address sender_,
        address tokenAddress_,
        uint256 amount_,
        uint256 timeToLock_
    ) internal {
        VaultStorage storage _vs = getVaultStorage();

        require(
            _vs.userTokenBalance[sender_][tokenAddress_] >= amount_,
            "DAOVault: Not enough tokens to lock."
        );

        _vs.lockedTokens[sender_][tokenAddress_].purgeTimeLocks();
        _vs.lockedTokens[sender_][tokenAddress_].lock(amount_, timeToLock_);
    }

    function _lockNFT(address sender_, address tokenAddress_, uint256 timeToLock_) internal {
        VaultStorage storage _vs = getVaultStorage();

        require(_vs.userNFTs[sender_][tokenAddress_].length() > 0, "DAOVault: No NFT to lock.");

        uint256 userTokenId_ = _vs.userNFTs[sender_][tokenAddress_].at(0);
        _vs.lockedTokens[sender_][tokenAddress_].lockNFT(userTokenId_, timeToLock_);

        emit LockedNFT(tokenAddress_, sender_, userTokenId_, timeToLock_);
    }

    function _withdraw(address tokenAddress_, uint256 amount_) internal {
        VaultStorage storage _vs = getVaultStorage();

        require(
            _vs.lockedTokens[msg.sender][tokenAddress_].isAbleToWithdraw(
                _vs.userTokenBalance[msg.sender][tokenAddress_],
                amount_
            ),
            "DAOVault: Trying to withdraw more than locked."
        );

        if (_vs.userTokenBalance[msg.sender][tokenAddress_] - amount_ == 0) {
            _removeTokenFromUser(tokenAddress_);
        }

        _vs.userTokenBalance[msg.sender][tokenAddress_] -= amount_;
        _vs.tokenBalance[tokenAddress_] -= amount_;

        _vs.lockedTokens[msg.sender][tokenAddress_].purgeTimeLocks();

        tokenAddress_.sendFunds(msg.sender, amount_);

        emit Withdrew(tokenAddress_, msg.sender, amount_);
    }

    function _removeTokenFromUser(address tokenAddress_) internal {
        VaultStorage storage _vs = getVaultStorage();

        _vs.userTokens[msg.sender].remove(tokenAddress_);

        if (_vs.userTokens[msg.sender].length() == 0) {
            _vs.permissionManager.removeUserFromGroups(msg.sender, getDAOGroup(DAO_RESERVED_NAME));
        }
    }
}
