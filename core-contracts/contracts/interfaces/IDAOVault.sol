// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title IDAOVault
 * @dev Interface for a vault contract that stores and manages tokens for a DAO.
 */
interface IDAOVault {
    struct TomeLockInfo {
        uint256 withdrawalAmount;
        uint256 lockedAmount;
        uint256 unlockTime;
    }

    event TokenDeposited(address indexed tokenAddress, address indexed sender, uint256 amount);
    event NFTDeposited(address indexed tokenAddress, address indexed sender, uint256 tokenId);
    event AuthorizedBySBT(address indexed tokenAddress, address indexed sender);

    event TokenLocked(
        address indexed tokenAddress,
        address indexed sender,
        uint256 amount,
        uint256 unlockTime
    );
    event NFTLocked(
        address indexed tokenAddress,
        address indexed sender,
        uint256 tokenId,
        uint256 unlockTime
    );
    event AuthenticationBySBT(
        address indexed tokenAddress,
        address indexed sender,
        uint256 unlockTime
    );

    event TokenWithdrew(address indexed tokenAddress, address indexed sender, uint256 amount);
    event NFTWithdrew(address indexed tokenAddress, address indexed sender, uint256 tokenId);
    event SBTAuthorizationRevoked(address indexed tokenAddress, address indexed sender);

    /**
     * @dev Deposits Native tokens to the vault.
     */
    function depositNative() external payable;

    /**
     * @dev Deposits ERC20 and Native tokens to the vault.
     * @param tokenAddress_ The address of the ERC20 token to deposit.
     * @param amount_ The amount of ERC20 tokens to deposit.
     */
    function depositERC20(address tokenAddress_, uint256 amount_) external;

    /**
     * @dev Deposits ERC721 tokens to the vault.
     * @param tokenAddress_ The address of the ERC721 token to deposit.
     * @param tokenId_ The id of the ERC721 token to deposit.
     */
    function depositNFT(address tokenAddress_, uint256 tokenId_) external;

    /**
     * @dev Authorizes the user with DAO Token Holder role with SBT token.
     * @param tokenAddress_ The address of the SBT to authorize.
     */
    function authorizeBySBT(address tokenAddress_) external;

    /**
     * @dev Locks and Native tokens in the vault for a specified time period.
     * @param sender_ The address of the account sending the tokens to be locked.
     * @param tokenAddress_ The address of the token to lock.
     * @param amount_ The amount of tokens to lock.
     * @param timeToLock_ The time period for which the tokens should be locked.
     *
     * ERC165 standard is used to identify other token types.
     */
    function lock(
        address sender_,
        address tokenAddress_,
        uint256 amount_,
        uint256 timeToLock_
    ) external;

    /**
     * @dev Withdraws Native tokens from the vault.
     * @param amount_ The amount of Q tokens to withdraw.
     */
    function withdrawNative(uint256 amount_) external;

    /**
     * @dev Withdraws ERC20 and Native tokens from the vault.
     * @param tokenAddress_ The address of the token to withdraw.
     * @param amount_ The amount of tokens to withdraw.
     */
    function withdrawERC20(address tokenAddress_, uint256 amount_) external;

    /**
     * @dev Withdraws ERC721 tokens from the vault.
     * @param tokenAddress_ The address of the token to withdraw.
     * @param tokenId_ The id of the token to withdraw.
     */
    function withdrawNFT(address tokenAddress_, uint256 tokenId_) external;

    /**
     * @dev Revokes the authorization of a SBT.
     * @param tokenAddress_ The address of the token that was used for the authorization.
     */
    function revokeSBTAuthorization(address tokenAddress_) external;

    /**
     * @notice Returns the total supply of a given token.
     * @param tokenAddress_ The address of the token to get the total supply for.
     * @return The total supply of the token.
     */
    function getTokenSupply(address tokenAddress_) external view returns (uint256);

    /**
     * @notice Returns the balance of a given user for a given token in vault.
     * @param userAddress_ The address of the user to get the balance for.
     * @param tokenAddress_ The address of the token to get the balance for.
     * @return The balance of the user for the token.
     */
    function getUserTokenBalance(
        address userAddress_,
        address tokenAddress_
    ) external view returns (uint256);

    /**
     * @notice Returns the balance of a given token in vault.
     * @param tokenAddress_ The address of the token to get the balance for.
     * @return The balance of the token.
     */
    function getTokenBalance(address tokenAddress_) external view returns (uint256);

    /**
     * @notice Returns the voting power of a given user.
     * @param userAddress_ The address of the user to get the voting power for.
     * @return The amount of voting power the user has in the DAO.
     *
     * NOTE: for now the voting power is calculated as the sum of all the tokens the user has in the DAO.
     */
    function getUserVotingPower(
        address userAddress_,
        address tokenAddress_
    ) external view returns (uint256);

    /**
     * @notice Returns the list of tokens that a given user has in the DAO.
     * @param userAddress_ The address of the user to get the list of tokens for.
     * @return The list of tokens the user has in the DAO.
     */
    function getUserTokens(address userAddress_) external view returns (address[] memory);

    /**
     * @notice Returns Time Locked information for a given user and token.
     */
    function getTimeLockInfo(
        address userAddress_,
        address tokenAddress_
    ) external view returns (TomeLockInfo memory info_);

    /**
     * @notice Returns the list of NFTs that a given user has in the DAO.
     * @param userAddress_ The address of the user to get the list of NFTs for.
     * @return The list of NFTs the user has in the DAO.
     */
    function getUserNFTs(
        address userAddress_,
        address tokenAddress_
    ) external view returns (uint256[] memory);

    /**
     * @notice Returns true if the user is authorized by SBT.
     */
    function isAuthorizedBySBT(
        address sender_,
        address tokenAddress_
    ) external view returns (bool);

    /**
     * @notice Returns true if the token supports the corresponding interfaces for
     * NFT and NFTEnumerable standards.
     */
    function isSupportedNFT(address tokenAddress_) external view returns (bool);

    /**
     * @notice Returns true if the token supports the corresponding interfaces for
     * ERC5484 and NFT and NFTEnumerable standards.
     */
    function isSupportedSBT(address tokenAddress_) external view returns (bool);
}
