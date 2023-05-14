// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @notice IDiamondLoupe interface by the [EIP-2535 Diamonds, Multi-Facet Proxy](https://eips.ethereum.org/EIPS/eip-2535)
 * @dev These functions are expected to be called frequently by tools.
 */
interface IDiamondLoupe {
    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    /**
     * @notice Gets all facet addresses and their four byte function selectors.
     */
    function facets() external view returns (Facet[] memory facets_);

    /**
     * @notice Gets all the function selectors supported by a specific facet.
     * @param facet_ The facet address.
     */
    function facetFunctionSelectors(
        address facet_
    ) external view returns (bytes4[] memory facetFunctionSelectors_);

    /**
     * @notice Gets all the facet addresses used by a diamond.
     */
    function facetAddresses() external view returns (address[] memory facetAddresses_);

    /**
     * @notice Gets the facet that supports the given selector.
     * @dev If facet is not found return address(0).
     * @param functionSelector_ The function selector.
     */
    function facetAddress(bytes4 functionSelector_) external view returns (address facetAddress_);
}
