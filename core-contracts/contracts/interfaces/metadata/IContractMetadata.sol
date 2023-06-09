// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title IContractMetadata
 * @dev Interface for a contract that provides metadata for the contract itself.
 */
interface IContractMetadata {
    event ContractURIChanged(string contractURI);

    /**
     * @dev Sets the contract metadata URI.
     * @param contractURI_ The URI to set for the contract metadata.
     */
    function setContractMetadata(string calldata contractURI_) external;

    /**
     * @dev Retrieves the contract metadata URI.
     * @return A string representing the URI for the contract metadata.
     */
    function contractURI() external view returns (string memory);
}
