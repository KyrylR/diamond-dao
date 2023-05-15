// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity ^0.8.19;

import "@dlsl/dev-modules/contracts-registry/AbstractDependant.sol";

import "../../core/Globals.sol";
import "../../core/PermissionManager.sol";

import "../../libs/ArrayHelper.sol";

contract TreasuryMock is IDAOIntegration, AbstractDependant {
    using ArrayHelper for *;

    string public constant TREASURY_RESOURCE = "TREASURY";

    PermissionManager public permissionManager;

    mapping(address => uint256) public awardParts;

    modifier onlyUpdatePermission() {
        _requirePermission(UPDATE_PERMISSION);
        _;
    }

    receive() external payable {}

    /// @inheritdoc AbstractDependant
    function setDependencies(
        address registryAddress_,
        bytes calldata
    ) external override dependant {
        permissionManager = PermissionManager(registryAddress_);
    }

    function setRewardPart(address user_, uint256 part_) external onlyUpdatePermission {
        awardParts[user_] = part_;
    }

    function withdrawReward() external {
        uint256 availableAmount = address(this).balance;
        uint256 part = awardParts[msg.sender];

        require(part > 0, "Treasury: no reward");
        require(availableAmount > 0, "Treasury: no funds");

        uint256 amount = (availableAmount * part) / PERCENTAGE_100;

        awardParts[msg.sender] = 0;

        (bool success_, ) = payable(msg.sender).call{value: amount}("");
        require(success_, "Treasury: transfer failed");
    }

    /// @inheritdoc IDAOIntegration
    function getResourceRecords() external pure override returns (ResourceRecords[] memory) {
        ResourceRecords[] memory records_ = new ResourceRecords[](3);

        string[] memory memberPermissions_ = [
            CREATE_VOTING_PERMISSION,
            VOTE_FOR_PERMISSION,
            VOTE_PERMISSION
        ].asArray();

        string[] memory expertPermissions_ = [EXPERT_PERMISSION].asArray();

        records_[0] = ResourceRecords(
            getDAOMemberRole(DAO_RESERVED_NAME)[0],
            TREASURY_RESOURCE,
            memberPermissions_
        );

        records_[1] = ResourceRecords(
            getDAOExpertRole(DAO_RESERVED_NAME)[0],
            TREASURY_RESOURCE,
            expertPermissions_
        );

        records_[2] = ResourceRecords(
            getDAOVotingRole(DAO_RESERVED_NAME)[0],
            TREASURY_RESOURCE,
            [UPDATE_PERMISSION].asArray()
        );

        return records_;
    }

    function checkPermission(
        address member_,
        string calldata permission_
    ) external view returns (bool) {
        return permissionManager.hasPermission(member_, TREASURY_RESOURCE, permission_);
    }

    function getResource() external pure returns (string memory) {
        return TREASURY_RESOURCE;
    }

    function _requirePermission(string memory permission_) private view {
        require(
            permissionManager.hasPermission(msg.sender, TREASURY_RESOURCE, permission_),
            "Treasury: access denied"
        );
    }
}
