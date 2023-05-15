// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity ^0.8.19;

import "../../interfaces/IDAOIntegration.sol";

contract BadExternalModule is IDAOIntegration {
    function getResourceRecords() external pure override returns (ResourceRecords[] memory) {
        revert("BadExternalModule: not implemented");
    }
}
