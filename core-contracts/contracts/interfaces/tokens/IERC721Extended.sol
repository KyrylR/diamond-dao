// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";

/**
 * @title IERC721
 * @dev Interface for a ERC721 token contract that is ERC721-compliant and supports additional features.
 */
interface IERC721Extended is IERC721EnumerableUpgradeable {
    /**
     * @dev Struct to pass constructor parameters to the IERC721 implementation contract.
     * @param name The name of the ERC721 token.
     * @param symbol The symbol of the ERC721 token.
     * @param contractURI The URI of the contract metadata.
     * @param baseURI The base URI for the token metadata.
     * @param totalSupplyCap The maximum total supply for the ERC721 token.
     */
    struct ConstructorParams {
        string name;
        string symbol;
        string contractURI;
        string baseURI;
        uint256 totalSupplyCap;
    }

    /**
     * @dev Mints a new ERC721 token to the specified receiver address.
     * @param receiver_ The address of the receiver of the new ERC721 token.
     * @param tokenId_ The ID of the new ERC721 token.
     * @param tokenURI_ The URI for the metadata of the new ERC721 token.
     */
    function mintTo(address receiver_, uint256 tokenId_, string calldata tokenURI_) external;

    /**
     * @dev Burns an existing ERC721 token owned by the specified payer address.
     * @param payer_ The address of the payer that owns the ERC721 token to burn.
     * @param tokenId_ The ID of the ERC721 token to burn.
     */
    function burnFrom(address payer_, uint256 tokenId_) external;

    /**
     * @dev Sets the base URI for the ERC721 token metadata.
     * @param baseURI_ The new base URI for the token metadata.
     */
    function setBaseURI(string calldata baseURI_) external;

    /**
     * @dev Sets the token URI for an existing ERC721 token.
     * @param tokenId_ The ID of the ERC721 token to update.
     * @param tokenURI_ The new URI for the token metadata.
     */
    function setTokenURI(uint256 tokenId_, string calldata tokenURI_) external;
}
