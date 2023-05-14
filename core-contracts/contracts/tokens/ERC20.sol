// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "../interfaces/tokens/IERC20Extended.sol";

import "../metadata/ContractMetadata.sol";

/**
 * @title ERC20
 *
 * Regular ERC20 token with additional features:
 * - minting and burning
 * - total supply cap
 * - contract metadata
 */
contract ERC20 is IERC20Extended, ERC20Upgradeable, OwnableUpgradeable, ContractMetadata {
    string public ERC20_RESOURCE;

    uint256 public totalSupplyCap;

    uint8 internal _decimals;

    function __ERC20_init(
        ConstructorParams calldata params_,
        string calldata resource_
    ) external initializer {
        __Ownable_init();
        __ERC20_init(params_.name, params_.symbol);
        __ContractMetadata_init(params_.contractURI);

        ERC20_RESOURCE = resource_;

        _decimals = params_.decimals;

        totalSupplyCap = params_.totalSupplyCap;
    }

    modifier onlyChangeMetadataPermission() override {
        _checkOwner();
        _;
    }

    function mintTo(address account_, uint256 amount_) external override onlyOwner {
        require(
            totalSupplyCap == 0 || totalSupply() + amount_ <= totalSupplyCap,
            "[QGDK-015000]-The total supply capacity exceeded, minting is not allowed."
        );

        _mint(account_, amount_);
    }

    function burnFrom(address account_, uint256 amount_) external override {
        if (account_ != msg.sender) {
            _spendAllowance(account_, msg.sender, amount_);
        }

        _burn(account_, amount_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
