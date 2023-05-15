import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import {
  DAO_MEMBER_STORAGE_NAME,
  CREATE_PERMISSION,
  DELETE_PERMISSION,
  VOTING_NAME,
  DAO_RESERVED_NAME,
  DAO_PERMISSION_MANAGER_NAME,
  ZERO_ADDRESS,
} from "../utils/constants";

import { PermissionManager, DAOMemberStorage, DiamondDAO, DAOParameterStorage, DAOVault, IRBAC } from "@ethers-v5";

import {
  buildFaucetCutsFromFuncSigs,
  DAOMemberStorageFuncSigs,
  DAOParameterStorageFuncSigs,
  PermissionManagerFuncSigs,
} from "@/test/utils/faucetCuts";
import { cast } from "@/test/utils/caster";
import { FacetCutAction, FuncNameToSignature } from "@/test/utils/types";

describe("DiamondDAO", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;

  let diamond: DiamondDAO;
  let manager: PermissionManager;
  let daoMemberStorage: DAOMemberStorage;

  let managerFaucet: PermissionManager;
  let daoMemberStorageFaucet: DAOMemberStorage;

  const DAOMemberStorageCreateRole = "SCR";
  const DAOMemberStorageDeleteRole = "SDR";

  before("setup", async () => {
    [OWNER, USER1] = await ethers.getSigners();

    const DiamondDAO = await ethers.getContractFactory("DiamondDAO");
    diamond = await DiamondDAO.deploy();

    const DAOMemberStorage = await ethers.getContractFactory("DAOMemberStorage");
    daoMemberStorage = await DAOMemberStorage.deploy();
    daoMemberStorageFaucet = daoMemberStorage;

    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    manager = await PermissionManager.deploy();
    managerFaucet = manager;

    const memberStorageFaucetCuts = buildFaucetCutsFromFuncSigs(DAOMemberStorageFuncSigs, daoMemberStorage.address, 0);
    const permissionManagerFaucetCuts = buildFaucetCutsFromFuncSigs(PermissionManagerFuncSigs, manager.address, 0);

    await diamond.diamondCut(memberStorageFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(permissionManagerFaucetCuts, ethers.constants.AddressZero, "0x");

    daoMemberStorage = await DAOMemberStorage.attach(diamond.address);
    manager = await PermissionManager.attach(diamond.address);

    await manager.__PermissionManager_init(OWNER.address, DAO_PERMISSION_MANAGER_NAME, DAO_RESERVED_NAME);
    await daoMemberStorage.__DAOMemberStorage_init(DAO_RESERVED_NAME, DAO_MEMBER_STORAGE_NAME);

    await manager.confMemberGroup(VOTING_NAME, DAO_RESERVED_NAME);
    await manager.confExpertsGroups(VOTING_NAME, DAO_RESERVED_NAME);

    const DAOMemberStorageCreate: IRBAC.ResourceWithPermissionsStruct[] = [
      {
        resource: DAO_MEMBER_STORAGE_NAME,
        permissions: [CREATE_PERMISSION],
      },
    ];
    const DAOMemberStorageDelete: IRBAC.ResourceWithPermissionsStruct[] = [
      {
        resource: DAO_MEMBER_STORAGE_NAME,
        permissions: [DELETE_PERMISSION],
      },
    ];

    await manager.addPermissionsToRole(DAOMemberStorageCreateRole, DAOMemberStorageCreate, true);
    await manager.addPermissionsToRole(DAOMemberStorageDeleteRole, DAOMemberStorageDelete, true);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("should initialize only once", async () => {
      await expect(daoMemberStorage.__DAOMemberStorage_init(DAO_RESERVED_NAME, "")).to.be.revertedWith(
        "DAOMemberStorage: already initialized"
      );
    });

    it("should revert if not called by owner", async () => {
      await expect(diamond.connect(USER1).diamondCut([], ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: not an owner"
      );
    });

    it("should transfer ownership", async () => {
      await expect(diamond.connect(USER1).transferOwnership(USER1.address)).to.be.revertedWith(
        "DiamondDAO: not an owner"
      );

      await expect(diamond.transferOwnership(ZERO_ADDRESS)).to.be.revertedWith("DiamondDAO: zero address owner");

      await expect(diamond.transferOwnership(USER1.address));
    });

    it("should revert if selector not registered", async () => {
      const newFaucet = await ethers.getContractFactory("DAOVault");

      const newFaucetInstance = await newFaucet.attach(diamond.address);

      await expect(newFaucetInstance.getTokenSupply(ZERO_ADDRESS)).to.be.revertedWith(
        "DiamondDAO: selector is not registered."
      );
    });
  });

  describe("facets/facetAddresses/facetFunctionSelectors", () => {
    it("should return correct facets", async () => {
      const getFacetWithSelectors = (funcSigs: FuncNameToSignature, faucet: string) => {
        const faucetWithSelector: { facetAddress: string; functionSelectors: string[] } = {
          facetAddress: faucet,
          functionSelectors: [],
        };

        for (const [, /*funcName*/ funcSig] of Object.entries(funcSigs)) {
          faucetWithSelector.functionSelectors.push(funcSig);
        }

        return faucetWithSelector;
      };

      const memberStorageFaucetCuts = getFacetWithSelectors(DAOMemberStorageFuncSigs, daoMemberStorageFaucet.address);
      const permissionManagerFaucetCuts = getFacetWithSelectors(PermissionManagerFuncSigs, managerFaucet.address);

      expect(cast(await diamond.facets())).to.be.deep.equal([memberStorageFaucetCuts, permissionManagerFaucetCuts]);
    });

    it("should return correct facet addresses", async () => {
      expect(cast(await diamond.facetAddresses())).to.be.deep.equal([
        daoMemberStorageFaucet.address,
        managerFaucet.address,
      ]);
    });

    it("should return correct facet function selectors", async () => {
      const getSelectors = (funcSigs: FuncNameToSignature) => {
        const functionSelectors: string[] = [];

        for (const [, /*funcName*/ funcSig] of Object.entries(funcSigs)) {
          functionSelectors.push(funcSig);
        }

        return functionSelectors;
      };

      expect(await diamond.facetFunctionSelectors(daoMemberStorageFaucet.address)).to.be.deep.equal(
        getSelectors(DAOMemberStorageFuncSigs)
      );
      expect(await diamond.facetFunctionSelectors(managerFaucet.address)).to.be.deep.equal(
        getSelectors(PermissionManagerFuncSigs)
      );
    });
  });

  describe("diamondCut", () => {
    it("should add Faucet", async () => {
      const newFaucet = await ethers.getContractFactory("DAOParameterStorage");
      const newFaucetInstance = await newFaucet.deploy();

      let newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 0);

      await diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x");

      expect(cast(await diamond.facetAddresses())).to.be.deep.equal([
        daoMemberStorageFaucet.address,
        managerFaucet.address,
        newFaucetInstance.address,
      ]);

      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: selector already added"
      );

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, ZERO_ADDRESS, 0);

      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: facet is not a contract"
      );

      newFaucetCuts[0].facetAddress = newFaucetInstance.address;
      newFaucetCuts[0].functionSelectors = [];
      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: no selectors provided"
      );
    });

    it("should remove Faucet", async () => {
      const newFaucet = await ethers.getContractFactory("DAOParameterStorage");
      const newFaucetInstance = await newFaucet.deploy();

      let newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 0);

      await diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x");

      expect(cast(await diamond.facetAddresses())).to.be.deep.equal([
        daoMemberStorageFaucet.address,
        managerFaucet.address,
        newFaucetInstance.address,
      ]);

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, ethers.constants.AddressZero, 2);

      newFaucetCuts[0].functionSelectors[0] = "0xb4d5d870";
      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: selector from another facet"
      );

      newFaucetCuts[0].functionSelectors = [];
      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: no selectors provided"
      );

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 2);

      await diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x");

      expect(cast(await diamond.facetAddresses())).to.be.deep.equal([
        daoMemberStorageFaucet.address,
        managerFaucet.address,
      ]);

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 0);
      await diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x");

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 2);
      newFaucetCuts.pop();
      await diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x");

      expect(cast(await diamond.facetAddresses())).to.be.deep.equal([
        daoMemberStorageFaucet.address,
        managerFaucet.address,
        newFaucetInstance.address,
      ]);
    });

    it("should replace Faucet", async () => {
      const newFaucet = await ethers.getContractFactory("DAOParameterStorage");
      const newFaucetInstance = await newFaucet.deploy();

      let newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 0);
      await diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x");

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 1);
      newFaucetCuts[0].functionSelectors[0] = "0xb4d5d875";
      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: selector not found"
      );

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 1);
      newFaucetCuts[0].functionSelectors = [];
      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: no selectors provided"
      );

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 1);
      newFaucetCuts[0].facetAddress = ethers.constants.AddressZero;
      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: facet is not a contract"
      );

      newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 1);
      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWith(
        "DiamondDAO: selector already added"
      );

      await diamond.diamondCut(
        [
          {
            facetAddress: diamond.address,
            action: FacetCutAction.Replace,
            functionSelectors: ["0xb4d5d870"],
          },
        ],
        ethers.constants.AddressZero,
        "0x"
      );

      await expect(
        diamond.diamondCut(
          [
            {
              facetAddress: newFaucetInstance.address,
              action: FacetCutAction.Replace,
              functionSelectors: ["0xb4d5d870"],
            },
          ],
          ethers.constants.AddressZero,
          "0x"
        )
      ).to.be.revertedWith("DiamondDAO: can't replace immutable function");
    });

    it("should revert for incorrect FacetCutAction", async () => {
      const newFaucet = await ethers.getContractFactory("DAOParameterStorage");
      const newFaucetInstance = await newFaucet.deploy();

      let newFaucetCuts = buildFaucetCutsFromFuncSigs(DAOParameterStorageFuncSigs, newFaucetInstance.address, 10);
      await expect(diamond.diamondCut(newFaucetCuts, ethers.constants.AddressZero, "0x")).to.be.revertedWithoutReason();
    });
  });

  describe("supportsInterface", () => {
    it("should return true for ERC165", async () => {
      expect(await diamond.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("should return true for IDiamond", async () => {
      expect(await diamond.supportsInterface("0x00000000")).to.be.true;
    });

    it("should return true for IDiamondCut", async () => {
      expect(await diamond.supportsInterface("0x1f931c1c")).to.be.true;
    });

    it("should return true for IDiamondLoupe", async () => {
      expect(await diamond.supportsInterface("0x48e2b093")).to.be.true;
    });

    it("should return false for non-existent interface", async () => {
      expect(await diamond.supportsInterface("0x00000001")).to.be.false;
    });
  });
});
