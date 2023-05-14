// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";

import "./IERC5484.sol";

/**
 * @title ISBT
 * @dev Interface for a SBT token contract.
 */
interface ISBT is IERC721EnumerableUpgradeable, IERC5484 {
    /**
     * @dev Struct to pass constructor parameters to the ISBT implementation contract.
     * @param name The name of the SBT token.
     * @param symbol The symbol of the SBT token.
     * @param contractURI The URI of the contract metadata.
     * @param baseURI The base URI for the token metadata.
     * @param totalSupplyCap The maximum total supply for the SBT token.
     */
    struct ConstructorParams {
        string name;
        string symbol;
        string contractURI;
        string baseURI;
        uint256 totalSupplyCap;
    }

    /**
     * @dev Mints a new SBT token to the specified receiver address.
     * @param receiver_ The address of the receiver of the new SBT token.
     * @param tokenId_ The ID of the new SBT token.
     * @param tokenURI_ The URI for the metadata of the new SBT token.
     * @param burnAuth_ The burn authorization for the new SBT token.
     */
    function mintTo(
        address receiver_,
        uint256 tokenId_,
        string calldata tokenURI_,
        BurnAuth burnAuth_
    ) external;

    /**
     * @dev Burns an existing SBT token.
     * @param tokenId_ The ID of the SBT token to burn.
     */
    function burn(uint256 tokenId_) external;

    /**
     * @dev Sets the base URI for the SBT token metadata.
     * @param baseURI_ The new base URI for the token metadata.
     */
    function setBaseURI(string calldata baseURI_) external;

    /**
     * @dev Sets the token URI for an existing SBT token.
     * @param tokenId_ The ID of the SBT token to update.
     * @param tokenURI_ The new URI for the token metadata.
     */
    function setTokenURI(uint256 tokenId_, string calldata tokenURI_) external;
}
