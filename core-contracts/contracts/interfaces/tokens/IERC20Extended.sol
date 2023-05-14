// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @title IERC20
 * @dev Interface for a ERC20 token contract that is ERC20-compliant and supports additional features.
 */
interface IERC20Extended is IERC20Upgradeable {
    /**
     * @dev Struct to pass constructor parameters to the IERC20 implementation contract.
     * @param name The name of the ERC20 token.
     * @param symbol The symbol of the ERC20 token.
     * @param contractURI The URI of the contract metadata.
     * @param decimals The number of decimals for the ERC20 token.
     * @param totalSupplyCap The maximum total supply for the ERC20 token.
     */
    struct ConstructorParams {
        string name;
        string symbol;
        string contractURI;
        uint8 decimals;
        uint256 totalSupplyCap;
    }

    /**
     * @dev Mints new ERC20 tokens to the specified account address.
     * @param account_ The address of the account to mint new ERC20 tokens to.
     * @param amount_ The amount of ERC20 tokens to mint.
     */
    function mintTo(address account_, uint256 amount_) external;

    /**
     * @dev Burns existing ERC20 tokens owned by the specified account address.
     * @param account_ The address of the account that owns the ERC20 tokens to burn.
     * @param amount_ The amount of ERC20 tokens to burn.
     */
    function burnFrom(address account_, uint256 amount_) external;
}
