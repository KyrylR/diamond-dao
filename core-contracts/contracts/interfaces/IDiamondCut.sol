// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IDiamond.sol";

/**
 * @notice IDiamondCut interface by the [EIP-2535 Diamonds, Multi-Facet Proxy](https://eips.ethereum.org/EIPS/eip-2535)
 */
interface IDiamondCut is IDiamond {
    /**
     * @dev Add/replace/remove any number of functions and optionally execute
     *      a function with delegatecall
     * @param diamondCut_ Contains the facet addresses and function selectors
     * @param initContract_ The address of the contract or facet to execute initPayload_.
     * @param initPayload_ A function call, including function selector and arguments
     *                     initPayload_ is executed with delegatecall on initContract_
     */
    function diamondCut(
        FacetCut[] calldata diamondCut_,
        address initContract_,
        bytes calldata initPayload_
    ) external;
}
