// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../core/RBAC/RBACGroupable.sol";

contract RBACGroupableMock is RBACGroupable {
    using TypeCaster for string;

    function __RBACGroupableMock_init() external {
        __RBACGroupable_init();

        _grantRoles(msg.sender, MASTER_ROLE.asSingletonArray());
    }

    function mockInit() external {
        __RBACGroupable_init();
    }
}
