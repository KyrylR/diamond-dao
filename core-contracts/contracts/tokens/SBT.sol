// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

import "../interfaces/tokens/ISBT.sol";

import "../metadata/ContractMetadata.sol";

/**
 * @title SBT
 */
contract SBT is
    ISBT,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    ContractMetadata
{
    string public SBT_RESOURCE;

    string public baseURI;
    uint256 public totalSupplyCap;

    mapping(uint256 => BurnAuth) public authorization;

    function __SBT_init(
        ConstructorParams calldata params_,
        string calldata resource_
    ) external initializer {
        __Ownable_init();
        __ERC721_init(params_.name, params_.symbol);
        __ContractMetadata_init(params_.contractURI);

        SBT_RESOURCE = resource_;

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
        string calldata tokenURI_,
        BurnAuth burnAuth_
    ) external virtual override {
        require(
            totalSupplyCap == 0 || totalSupply() + 1 <= totalSupplyCap,
            "SBT: The total supply capacity exceeded, minting is not allowed."
        );

        _mint(receiver_, tokenId_);
        _setTokenURI(tokenId_, tokenURI_);

        authorization[tokenId_] = burnAuth_;

        emit Issued(msg.sender, receiver_, tokenId_, burnAuth_);
    }

    function burn(uint256 tokenId_) external virtual override {
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
            "SBT: Set token URI not approved by the owner of the SBT."
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
        virtual
        override(ERC721EnumerableUpgradeable, ERC721Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(ISBT).interfaceId ||
            interfaceId == type(IERC5484).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function isAbleToBurn(
        address account_,
        uint256 tokenId_
    ) external view virtual returns (bool) {
        return _isAbleToBurn(account_, tokenId_);
    }

    function burnAuth(uint256 tokenId_) external view virtual override returns (BurnAuth) {
        return authorization[tokenId_];
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
    ) internal virtual override(ERC721EnumerableUpgradeable, ERC721Upgradeable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        if (from == address(0)) {
            _checkOwner();
            require(ERC721Upgradeable.balanceOf(to) == 0, "SBT: The user already has a SBT.");
        } else if (to == address(0)) {
            require(_isAbleToBurn(msg.sender, tokenId), "SBT: Burn not authorized.");
        } else {
            revert("SBT: Not transferable.");
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function _isAbleToBurn(address account_, uint256 tokenId_) internal view returns (bool) {
        BurnAuth auth_ = authorization[tokenId_];

        if (auth_ == BurnAuth.Neither) {
            return false;
        }

        bool isIssuerAuth_ = auth_ == BurnAuth.Both || auth_ == BurnAuth.IssuerOnly;

        if (isIssuerAuth_ && account_ == owner()) {
            return true;
        }

        bool isOwnerAuth_ = auth_ == BurnAuth.Both || auth_ == BurnAuth.OwnerOnly;

        bool isTokenOwner_ = ownerOf(tokenId_) == account_ ||
            getApproved(tokenId_) == account_ ||
            isApprovedForAll(ownerOf(tokenId_), account_);

        if (isOwnerAuth_ && isTokenOwner_) {
            return true;
        }

        return false;
    }
}
