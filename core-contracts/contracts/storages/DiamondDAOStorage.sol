// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import "../interfaces/IDiamondCut.sol";
import "../interfaces/IDiamondLoupe.sol";

/**
 *  @notice The Diamond standard module
 *
 *  This is the storage contract for the diamond proxy
 */
abstract contract DiamondDAOStorage is IERC165, IDiamondLoupe {
    using Address for address;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    /**
     *  @notice The struct slot where the storage is
     */
    bytes32 public constant DIAMOND_STORAGE_SLOT = keccak256("diamond.standard.diamond.storage");

    /**
     *  @notice The storage of the Diamond proxy
     */
    struct DStorage {
        address owner;
        mapping(bytes4 => bool) supportedInterfaces;
        mapping(bytes4 => address) selectorToFacet;
        mapping(address => EnumerableSet.Bytes32Set) facetToSelectors;
        EnumerableSet.AddressSet facets;
    }

    modifier onlyOwner() {
        address diamondOwner_ = owner();

        require(
            diamondOwner_ == address(0) || diamondOwner_ == msg.sender,
            "DiamondDAO: not an owner"
        );
        _;
    }

    /**
     *  @notice The internal function to get the diamond proxy storage
     *  @return _ds the struct from the DIAMOND_STORAGE_SLOT
     */
    function getDiamondStorage() internal pure returns (DStorage storage _ds) {
        bytes32 slot_ = DIAMOND_STORAGE_SLOT;

        assembly {
            _ds.slot := slot_
        }
    }

    /**
     *  @inheritdoc IDiamondLoupe
     */
    function facets() external view returns (Facet[] memory facets_) {
        EnumerableSet.AddressSet storage _facets = getDiamondStorage().facets;

        facets_ = new Facet[](_facets.length());

        for (uint256 i = 0; i < facets_.length; i++) {
            address facet_ = _facets.at(i);

            facets_[i].facetAddress = facet_;
            facets_[i].functionSelectors = facetFunctionSelectors(facet_);
        }
    }

    /**
     *  @inheritdoc IDiamondLoupe
     */
    function facetAddresses() public view returns (address[] memory facetAddresses_) {
        return getDiamondStorage().facets.values();
    }

    /**
     *  @inheritdoc IDiamondLoupe
     */
    function facetFunctionSelectors(
        address facet_
    ) public view returns (bytes4[] memory facetFunctionSelectors_) {
        EnumerableSet.Bytes32Set storage _f2s = getDiamondStorage().facetToSelectors[facet_];

        facetFunctionSelectors_ = new bytes4[](_f2s.length());

        for (uint256 i = 0; i < facetFunctionSelectors_.length; i++) {
            facetFunctionSelectors_[i] = bytes4(_f2s.at(i));
        }
    }

    /**
     *  @inheritdoc IDiamondLoupe
     */
    function facetAddress(bytes4 functionSelector_) public view returns (address facetAddress_) {
        return getDiamondStorage().selectorToFacet[functionSelector_];
    }

    /**
     * @notice The function to get the owner of the diamond
     */
    function owner() public view returns (address) {
        return getDiamondStorage().owner;
    }

    /**
     *  @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId_) external view returns (bool) {
        return getDiamondStorage().supportedInterfaces[interfaceId_];
    }
}
