// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/metadata/IContractMetadata.sol";

/**
 * @title ContractMetadata
 * @notice A contract that allows changing and retrieving metadata about the contract,
 * such as a URI that points to a JSON file with information about the contract.
 */
abstract contract ContractMetadata is IContractMetadata, Initializable {
    string public constant CHANGE_METADATA_PERMISSION = "CHANGE_METADATA";

    string private _contractURI;

    /**
     * @dev Initializes the contract.
     * @param contractURI_ The contract URI.
     */
    function __ContractMetadata_init(string memory contractURI_) internal onlyInitializing {
        _contractURI = contractURI_;
    }

    modifier onlyChangeMetadataPermission() virtual {
        _;
    }

    /**
     * @dev Changes the contract URI.
     * @param contractURI_ The new contract URI.
     */
    function setContractMetadata(
        string calldata contractURI_
    ) external override onlyChangeMetadataPermission {
        _contractURI = contractURI_;

        emit ContractURIChanged(contractURI_);
    }

    /**
     * @dev Retrieves the contract URI.
     * @return The contract URI.
     */
    function contractURI() external view override returns (string memory) {
        return _contractURI;
    }
}
