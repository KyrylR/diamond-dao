// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @notice IDiamond interface by the [EIP-2535 Diamonds, Multi-Facet Proxy](https://eips.ethereum.org/EIPS/eip-2535)
 */
interface IDiamond {
    enum FacetCutAction {
        Add,
        Replace,
        Remove
    }

    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }

    event DiamondCut(FacetCut[] diamondCut, address initContract, bytes initPayload);
}
