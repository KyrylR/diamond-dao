// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../storages/DiamondDAOStorage.sol";

/**
 *  @notice DiamondDAO
 */
contract DiamondDAO is IDiamondCut, DiamondDAOStorage {
    using Address for address;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    constructor() {
        transferOwnership(msg.sender);

        DStorage storage _ds = getDiamondStorage();

        _ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        _ds.supportedInterfaces[type(IDiamond).interfaceId] = true;
        _ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        _ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
    }

    /**
     *  @notice The payable fallback function that delegatecall's the facet with associated selector
     */
    fallback() external payable {
        address facet_ = facetAddress(msg.sig);

        require(facet_ != address(0), "DiamondDAO: selector is not registered.");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result_ := delegatecall(gas(), facet_, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result_
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    function transferOwnership(address newOwner_) public onlyOwner {
        require(newOwner_ != address(0), "LibDiamondDAO: zero address owner");

        getDiamondStorage().owner = newOwner_;
    }

    /**
     *  @inheritdoc IDiamondCut
     */
    function diamondCut(
        FacetCut[] calldata diamondCut_,
        address initContract_,
        bytes calldata initPayload_
    ) external onlyOwner {
        for (uint256 i = 0; i < diamondCut_.length; i++) {
            FacetCut memory cut = diamondCut_[i];

            if (cut.action == FacetCutAction.Add) {
                _addFacet(cut.facetAddress, cut.functionSelectors);
            } else if (cut.action == FacetCutAction.Replace) {
                _replaceFaucet(cut.facetAddress, cut.functionSelectors);
            } else if (cut.action == FacetCutAction.Remove) {
                _removeFacet(cut.facetAddress, cut.functionSelectors);
            } else {
                revert("LibDiamondDAO: Incorrect FacetCutAction");
            }
        }

        emit DiamondCut(diamondCut_, initContract_, initPayload_);
    }

    /**
     *  @notice The internal function to add facets to a diamond
     *  @param facet_ the implementation address
     *  @param selectors_ the function selectors the implementation has
     */
    function _addFacet(address facet_, bytes4[] memory selectors_) internal {
        require(facet_.isContract(), "LibDiamondDAO: facet is not a contract");
        require(selectors_.length > 0, "LibDiamondDAO: no selectors provided");

        DStorage storage _ds = getDiamondStorage();

        for (uint256 i = 0; i < selectors_.length; i++) {
            require(
                _ds.selectorToFacet[selectors_[i]] == address(0),
                "LibDiamondDAO: selector already added"
            );

            _ds.selectorToFacet[selectors_[i]] = facet_;
            _ds.facetToSelectors[facet_].add(bytes32(selectors_[i]));
        }

        _ds.facets.add(facet_);
    }

    /**
     *  @notice The internal function to remove facets from the diamond
     *  @param facet_ the implementation to be removed. The facet itself will be
     *  removed only if there are no selectors left
     *  @param selectors_ the selectors of that implementation to be removed
     */
    function _removeFacet(address facet_, bytes4[] memory selectors_) internal {
        require(selectors_.length > 0, "LibDiamondDAO: no selectors provided");

        DStorage storage _ds = getDiamondStorage();

        for (uint256 i = 0; i < selectors_.length; i++) {
            require(
                _ds.selectorToFacet[selectors_[i]] == facet_,
                "LibDiamondDAO: selector from another facet"
            );

            _ds.selectorToFacet[selectors_[i]] = address(0);
            _ds.facetToSelectors[facet_].remove(bytes32(selectors_[i]));
        }

        if (_ds.facetToSelectors[facet_].length() == 0) {
            _ds.facets.remove(facet_);
        }
    }

    /**
     *  @notice The internal function to replace an existing facet with a new one
     *  @param facet_ the new implementation address
     *  @param selectors_ the function selectors the implementation has
     */
    function _replaceFaucet(address facet_, bytes4[] memory selectors_) internal {
        DStorage storage _ds = getDiamondStorage();

        require(facet_.isContract(), "LibDiamondDAO: facet is not a contract");
        require(selectors_.length > 0, "LibDiamondDAO: no selectors provided");

        for (uint256 i = 0; i < selectors_.length; i++) {
            bytes4 selector_ = selectors_[i];
            address oldFacetAddress_ = _ds.selectorToFacet[selector_];

            require(oldFacetAddress_ != address(0), "LibDiamondDAO: selector not found");
            require(oldFacetAddress_ != facet_, "LibDiamondDAO: selector already added");
            require(
                oldFacetAddress_ != address(this),
                "LibDiamondDAO: can't replace immutable function"
            );

            _ds.selectorToFacet[selector_] = facet_;
            _ds.facetToSelectors[facet_].add(bytes32(selector_));
        }
    }
}
