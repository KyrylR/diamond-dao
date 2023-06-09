// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

import "../interfaces/tokens/IERC721Extended.sol";

import "../metadata/ContractMetadata.sol";

/**
 * @title ERC721
 *
 * Regular ERC721 token with additional features:
 * - minting and burning
 * - total supply cap
 * - contract metadata
 */
contract ERC721Extended is
    IERC721Extended,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    ContractMetadata
{
    string public ERC721_RESOURCE;

    string public baseURI;
    uint256 public totalSupplyCap;

    function __ERC721_init(
        ConstructorParams calldata params_,
        string calldata resource_
    ) external initializer {
        __Ownable_init();
        __ERC721_init(params_.name, params_.symbol);
        __ContractMetadata_init(params_.contractURI);

        ERC721_RESOURCE = resource_;

        baseURI = params_.baseURI;

        totalSupplyCap = params_.totalSupplyCap;
    }

    modifier onlyChangeMetadataPermission() override {
        _checkOwner();
        _;
    }

    function mintTo(
        address receiver_,
        uint256 tokenId_,
        string calldata tokenURI_
    ) external override onlyOwner {
        require(
            totalSupplyCap == 0 || totalSupply() + 1 <= totalSupplyCap,
            "ERC721: The total supply capacity exceeded, minting is not allowed."
        );

        _mint(receiver_, tokenId_);
        _setTokenURI(tokenId_, tokenURI_);
    }

    function burnFrom(address payer_, uint256 tokenId_) external override {
        require(
            ownerOf(tokenId_) == payer_ &&
                (payer_ == msg.sender ||
                    (getApproved(tokenId_) == msg.sender || isApprovedForAll(payer_, msg.sender))),
            "ERC721: Burn not approved by the owner of the NFT."
        );

        _burn(tokenId_);
    }

    function setBaseURI(string calldata baseURI_) external override onlyOwner {
        baseURI = baseURI_;
    }

    function setTokenURI(uint256 tokenId_, string calldata tokenURI_) external override {
        require(
            ownerOf(tokenId_) == msg.sender ||
                getApproved(tokenId_) == msg.sender ||
                isApprovedForAll(ownerOf(tokenId_), msg.sender),
            "ERC721: Set token URI not approved by the owner of the NFT."
        );

        _setTokenURI(tokenId_, tokenURI_);
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override(ERC721URIStorageUpgradeable, ERC721Upgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721EnumerableUpgradeable, ERC721Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Extended).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721URIStorageUpgradeable, ERC721Upgradeable) {
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721EnumerableUpgradeable, ERC721Upgradeable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}
