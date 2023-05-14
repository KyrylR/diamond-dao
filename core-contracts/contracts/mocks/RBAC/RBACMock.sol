// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../core/RBAC/RBAC.sol";

contract RBACMock is RBAC {
    using TypeCaster for string;

    function __RBACMock_init() external {
        __RBAC_init();

        _grantRoles(msg.sender, MASTER_ROLE.asSingletonArray());
    }

    function mockInit() external {
        __RBAC_init();
    }
}
