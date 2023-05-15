import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import {
  CREATE_PERMISSION,
  UPDATE_PERMISSION,
  DELETE_PERMISSION,
  DAO_MEMBER_STORAGE_NAME,
  INTEGRATION_PERMISSION,
  VOTING_NAME,
  ZERO_ADDRESS,
  DAO_PERMISSION_MANAGER_NAME,
  DAO_RESERVED_NAME,
  DefaultERC20Params,
  ERC20_NAME,
  getDAOPanelResource,
} from "../utils/constants";

import { DAOVoting, PermissionManager, DAOMemberStorage, DiamondDAO, IRBAC, ERC20Extended } from "@ethers-v5";
import {
  buildFaucetCutsFromFuncSigs,
  DAOMemberStorageFuncSigs,
  DAOVotingFuncSigs,
  PermissionManagerFuncSigs,
} from "@/test/utils/faucetCuts";

describe("PermissionManager", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;

  let diamond: DiamondDAO;
  let daoVoting: DAOVoting;
  let erc20: ERC20Extended;
  let manager: PermissionManager;
  let daoMemberStorage: DAOMemberStorage;

  const DAOManagerCreateRole = "DMCR";
  const DAOManagerIntegrationRole = "DMIR";

  let daoVotingResource: string;
  let daoMemberStorageResource: string;
  let daoPermissionManagerResource: string;

  const DAORegistryRole1 = "DR1";

  const DAO_REGISTRY_RESOURCE = "DAO_REGISTRY_RESOURCE";

  const DAORegistryCreate: IRBAC.ResourceWithPermissionsStruct[] = [
    {
      resource: DAO_REGISTRY_RESOURCE,
      permissions: [CREATE_PERMISSION],
    },
  ];

  const DAORegistryUpdate: IRBAC.ResourceWithPermissionsStruct[] = [
    {
      resource: DAO_REGISTRY_RESOURCE,
      permissions: [UPDATE_PERMISSION],
    },
  ];

  const DAORegistryDelete: IRBAC.ResourceWithPermissionsStruct[] = [
    {
      resource: DAO_REGISTRY_RESOURCE,
      permissions: [DELETE_PERMISSION],
    },
  ];

  before("setup", async () => {
    [OWNER, USER1, USER2] = await ethers.getSigners();

    const DiamondDAO = await ethers.getContractFactory("DiamondDAO");
    diamond = await DiamondDAO.deploy();

    const DAOMemberStorage = await ethers.getContractFactory("DAOMemberStorage");
    daoMemberStorage = await DAOMemberStorage.deploy();

    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    daoVoting = await DAOVoting.deploy();

    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    manager = await PermissionManager.deploy();

    const ERC20 = await ethers.getContractFactory("ERC20Extended");
    erc20 = await ERC20.deploy();
    await erc20.__ERC20_init(DefaultERC20Params, ERC20_NAME);

    const votingFaucetCuts = buildFaucetCutsFromFuncSigs(DAOVotingFuncSigs, daoVoting.address, 0);
    const memberStorageFaucetCuts = buildFaucetCutsFromFuncSigs(DAOMemberStorageFuncSigs, daoMemberStorage.address, 0);
    const permissionManagerFaucetCuts = buildFaucetCutsFromFuncSigs(PermissionManagerFuncSigs, manager.address, 0);

    await diamond.diamondCut(votingFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(memberStorageFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(permissionManagerFaucetCuts, ethers.constants.AddressZero, "0x");

    daoVoting = await DAOVoting.attach(diamond.address);
    manager = await PermissionManager.attach(diamond.address);
    daoMemberStorage = await DAOMemberStorage.attach(diamond.address);

    daoVotingResource = getDAOPanelResource(VOTING_NAME, DAO_RESERVED_NAME);
    daoMemberStorageResource = getDAOPanelResource(DAO_MEMBER_STORAGE_NAME, DAO_RESERVED_NAME);
    daoPermissionManagerResource = getDAOPanelResource(DAO_PERMISSION_MANAGER_NAME, DAO_RESERVED_NAME);

    await daoVoting.__DAOVoting_init(DAO_RESERVED_NAME, erc20.address, daoVotingResource);
    await manager.__PermissionManager_init(OWNER.address, daoPermissionManagerResource, DAO_RESERVED_NAME);
    await daoMemberStorage.__DAOMemberStorage_init(DAO_RESERVED_NAME, daoMemberStorageResource);

    await manager.initialConfiguration(daoVoting.address, VOTING_NAME, DAO_RESERVED_NAME);

    const DAOManagerCreate: IRBAC.ResourceWithPermissionsStruct[] = [
      {
        resource: daoPermissionManagerResource,
        permissions: [CREATE_PERMISSION],
      },
    ];
    const DAOManagerIntegration: IRBAC.ResourceWithPermissionsStruct[] = [
      {
        resource: daoPermissionManagerResource,
        permissions: [INTEGRATION_PERMISSION],
      },
    ];

    await manager.addPermissionsToRole(DAOManagerCreateRole, DAOManagerCreate, true);
    await manager.addPermissionsToRole(DAOManagerIntegrationRole, DAOManagerIntegration, true);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("basic access", () => {
    it("should not initialize twice", async () => {
      await expect(manager.__PermissionManager_init(OWNER.address, "test", "Test panel")).to.be.revertedWith(
        "RBAC: already initialized"
      );
    });
  });

  describe("Add/Updated Veto Groups", () => {
    it("should add veto group", async () => {
      await expect(
        manager.connect(USER1).addVetoGroup(daoMemberStorage.address, "Veto Member Storage", daoMemberStorage.address)
      ).to.be.revertedWith("PermissionManager: The sender is not allowed to perform the action, access denied.");

      await manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", daoMemberStorage.address);

      await expect(
        manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", daoMemberStorage.address)
      ).to.be.revertedWith("PermissionManager: The veto group already exists.");

      await manager.addVetoGroup(daoMemberStorageResource, "Veto Member Storage", ZERO_ADDRESS);

      const vetoGroup = await manager.getVetoGroupInfo(daoMemberStorageResource);
      expect(vetoGroup.target).to.be.equal("DAO_MEMBER_STORAGE:DAO Token Holder");
      expect(vetoGroup.name).to.be.equal("Veto Member Storage");
      expect(vetoGroup.linkedMemberStorage).to.be.equal(ZERO_ADDRESS);
    });

    it("should add veto groups", async () => {
      await expect(
        manager.connect(USER1).addVetoGroups([
          {
            target: daoMemberStorageResource,
            name: "Veto Member Storage",
            linkedMemberStorage: daoMemberStorage.address,
          },
          {
            target: daoVotingResource,
            name: "Veto Voting",
            linkedMemberStorage: ZERO_ADDRESS,
          },
        ])
      ).to.be.revertedWith("PermissionManager: The sender is not allowed to perform the action, access denied.");

      expect(await manager.isVetoGroupExists(daoMemberStorageResource)).to.be.false;

      await manager.addVetoGroups([
        {
          target: daoMemberStorageResource,
          name: "Veto Member Storage",
          linkedMemberStorage: daoMemberStorage.address,
        },
        {
          target: daoVotingResource,
          name: "Veto Voting",
          linkedMemberStorage: ZERO_ADDRESS,
        },
      ]);

      expect(await manager.isVetoGroupExists(daoMemberStorageResource)).to.be.true;
    });

    it("should link new Member Storage to veto group", async () => {
      await expect(
        manager.connect(USER1).addVetoGroup(daoMemberStorageResource, "Veto Member Storage", daoMemberStorage.address)
      ).to.be.revertedWith("PermissionManager: The sender is not allowed to perform the action, access denied.");

      await expect(manager.linkStorageToVetoGroup(daoVotingResource, daoMemberStorage.address)).to.be.revertedWith(
        "PermissionManager: The veto group does not exists, impossible to link it with member storage."
      );

      expect(await manager.getExistingVetoGroupTargets()).to.be.empty;

      await manager.addVetoGroup(daoMemberStorageResource, "Veto Member Storage", daoMemberStorage.address);

      expect(await manager.getExistingVetoGroupTargets()).to.be.deep.equal([daoMemberStorageResource]);

      const DAOMemberStorage = await ethers.getContractFactory("DAOMemberStorage");
      const mockMemberStorage = await DAOMemberStorage.deploy();

      await expect(
        manager.connect(USER1).linkStorageToVetoGroup(daoMemberStorageResource, mockMemberStorage.address)
      ).to.be.revertedWith("PermissionManager: The sender is not allowed to perform the action, access denied.");

      let info = await manager.getVetoGroupInfo(daoMemberStorageResource);
      expect(info.linkedMemberStorage).to.be.equal(daoMemberStorage.address);

      await manager.linkStorageToVetoGroup(daoMemberStorageResource, mockMemberStorage.address);

      info = await manager.getVetoGroupInfo(daoMemberStorageResource);
      expect(info.linkedMemberStorage).to.be.equal(mockMemberStorage.address);

      await manager.linkStorageToVetoGroup(daoMemberStorageResource, ZERO_ADDRESS);

      info = await manager.getVetoGroupInfo(daoMemberStorageResource);
      expect(info.linkedMemberStorage).to.be.equal(ZERO_ADDRESS);
    });
  });

  describe("removeVetoGroup", () => {
    it("should remove veto group", async () => {
      await expect(manager.connect(USER1).removeVetoGroup(daoMemberStorage.address)).to.be.revertedWith(
        "PermissionManager: The sender is not allowed to perform the action, access denied."
      );

      await expect(
        manager.removeVetoGroup(daoMemberStorage.address),
        "PermissionManager: The veto group does not exists, impossible to remove it."
      );

      expect(await manager.getUserGroups(USER1.address)).to.be.empty;

      await manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", daoMemberStorage.address);
      await manager.removeVetoGroup(daoMemberStorage.address);
    });

    it("should remove veto group with no linked storage", async () => {
      await manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", ZERO_ADDRESS);
      await manager.removeVetoGroup(daoMemberStorage.address);
    });
  });

  describe("configure functions", () => {
    it("initialConfiguration", async () => {
      await expect(
        manager.connect(USER1).initialConfiguration(daoVoting.address, VOTING_NAME, DAO_RESERVED_NAME),
        "PermissionManager: The sender is not allowed to perform the action, access denied."
      );

      await manager.initialConfiguration(daoVoting.address, VOTING_NAME, DAO_RESERVED_NAME);
    });

    it("confVotingModule", async () => {
      await expect(
        manager.connect(USER1).confVotingModule(VOTING_NAME, daoVoting.address, DAO_RESERVED_NAME),
        "PermissionManager: The sender is not allowed to perform the action, access denied."
      );

      await manager.confVotingModule(VOTING_NAME, daoVoting.address, DAO_RESERVED_NAME);
    });

    it("confMemberGroup", async () => {
      await expect(manager.connect(USER1).confMemberGroup(VOTING_NAME, DAO_RESERVED_NAME)).to.be.revertedWith(
        "PermissionManager: The sender is not allowed to perform the action, access denied."
      );

      await manager.confMemberGroup(VOTING_NAME, DAO_RESERVED_NAME);
    });

    it("confExpertsGroups", async () => {
      await expect(manager.connect(USER1).confExpertsGroups(VOTING_NAME, DAO_RESERVED_NAME)).to.be.revertedWith(
        "PermissionManager: The sender is not allowed to perform the action, access denied."
      );

      await manager.confExpertsGroups(VOTING_NAME, DAO_RESERVED_NAME);
    });

    it("confExternalModule", async () => {
      const TreasuryMock = await ethers.getContractFactory("TreasuryMock");
      const treasuryModule = await TreasuryMock.deploy();

      const BadExternalModule = await ethers.getContractFactory("BadExternalModule");
      const badModule = await BadExternalModule.deploy();

      await expect(
        manager.connect(USER1).confExternalModule(treasuryModule.address),
        "PermissionManager: The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1.address, [DAOManagerIntegrationRole]);

      await expect(
        manager.connect(USER1).confExternalModule(badModule.address),
        "PermissionManager: The target contract must follow integration documentation."
      );

      await expect(
        manager.connect(USER1).confExternalModule(ZERO_ADDRESS),
        "PermissionManager: The target contract must follow integration documentation."
      );

      await manager.connect(USER1).confExternalModule(treasuryModule.address);
    });
  });

  describe("getters", () => {
    describe("DAORegistry", () => {
      it("should correctly check access for hasPermission (Create)", async () => {
        await manager.addPermissionsToRole(DAORegistryRole1, DAORegistryCreate, true);

        expect(await manager.hasPermission(USER1.address, DAO_REGISTRY_RESOURCE, CREATE_PERMISSION)).to.be.false;

        await manager.grantRoles(USER1.address, [DAORegistryRole1]);

        expect(await manager.hasPermission(USER1.address, DAO_REGISTRY_RESOURCE, CREATE_PERMISSION)).to.be.true;
      });

      it("should correctly check access for hasPermission (Update)", async () => {
        await manager.addPermissionsToRole(DAORegistryRole1, DAORegistryUpdate, true);

        expect(await manager.hasPermission(USER1.address, DAO_REGISTRY_RESOURCE, UPDATE_PERMISSION)).to.be.false;

        await manager.grantRoles(USER1.address, [DAORegistryRole1]);

        expect(await manager.hasPermission(USER1.address, DAO_REGISTRY_RESOURCE, UPDATE_PERMISSION)).to.be.true;
      });

      it("should correctly check access for hasePermission (Delete)", async () => {
        await manager.addPermissionsToRole(DAORegistryRole1, DAORegistryDelete, true);

        expect(await manager.hasPermission(USER1.address, DAO_REGISTRY_RESOURCE, DELETE_PERMISSION)).to.be.false;

        await manager.grantRoles(USER1.address, [DAORegistryRole1]);

        expect(await manager.hasPermission(USER1.address, DAO_REGISTRY_RESOURCE, DELETE_PERMISSION)).to.be.true;
      });
    });

    it("getVetoMembersCount", async () => {
      await manager.addVetoGroup(daoMemberStorageResource, "Veto Member Storage", ZERO_ADDRESS);

      expect(await manager.getVetoMembersCount(daoMemberStorageResource)).to.be.equal(0);
      expect(await manager.getVetoGroupMembers(daoMemberStorageResource)).to.be.deep.equal([]);

      await daoMemberStorage.addMember(USER2.address);
      await manager.linkStorageToVetoGroup(daoMemberStorageResource, daoMemberStorage.address);

      expect(await manager.getGroupRoles((await daoMemberStorage.getGroup())[0])).to.be.deep.equal([
        "DAOExpertRole:DAO Token Holder",
        "VetoGroupRoleFor:DAO_MEMBER_STORAGE:DAO Token Holder",
      ]);

      expect(await manager.getVetoMembersCount(daoMemberStorageResource)).to.be.equal(1);
      expect(await manager.getVetoGroupMembers(daoMemberStorageResource)).to.be.deep.equal([USER2.address]);

      await daoMemberStorage.addMember(USER1.address);

      expect(await manager.getVetoMembersCount(daoMemberStorageResource)).to.be.equal(2);
      expect(await manager.getVetoGroupMembers(daoMemberStorageResource)).to.be.deep.equal([
        USER2.address,
        USER1.address,
      ]);
    });
  });
});
