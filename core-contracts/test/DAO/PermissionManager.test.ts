import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import {
  CREATE_PERMISSION,
  UPDATE_PERMISSION,
  DELETE_PERMISSION,
  DAO_REGISTRY_NAME,
  DefaultVotingParams,
  DAO_VAULT_NAME,
  DAO_MEMBER_STORAGE_NAME,
  MASTER_ROLE,
  INTEGRATION_PERMISSION,
  ETHEREUM_ADDRESS,
  EXPERTS_VOTING_NAME,
  GENERAL_VOTING_NAME,
  ZERO_ADDRESS
} from "../utils/constants";

import { DAOVault, DAOVoting, PermissionManager, DAOMemberStorage  } from "@ethers-v5";

describe("PermissionManager", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;

  let manager: PermissionManager;
  let daoVoting: DAOVoting;
  let daoMemberStorage: DAOMemberStorage;

  const DAORegistryRole1 = "DR1";
  const DAOManagerCreateRole = "DMCR";
  const DAOManagerIntegrationRole = "DMIR";

  const DAO_REGISTRY_RESOURCE = "DAO_REGISTRY_RESOURCE";
  const DAO_MEMBER_STORAGE_RESOURCE = "DAO_MEMBER_STORAGE_RESOURCE";

  const DAORegistryCreate = [DAO_REGISTRY_RESOURCE, [CREATE_PERMISSION]];
  const DAORegistryUpdate = [DAO_REGISTRY_RESOURCE, [UPDATE_PERMISSION]];
  const DAORegistryDelete = [DAO_REGISTRY_RESOURCE, [DELETE_PERMISSION]];

  let DAOManagerCreate;
  let DAOManagerIntegration;

  before("setup", async () => {
    [OWNER, USER1, USER2] = await ethers.getSigners();

    daoVoting = await GeneralDAOVoting.new();
    daoMemberStorage = await DAOMemberStorage.new();

    let daoVault = await DAOVault.new();

    manager = await PermissionManager.new();

    await registry.__DAORegistry_init(
      (
        await PermissionManager.new()
      ).address,
      OWNER,
      DAO_REGISTRY_NAME,
      "Test panel",
      "daoURI"
    );

    manager = await PermissionManager.at(await registry.getPermissionManager());

    await registry.addProxyContract(DAO_VAULT_NAME, daoVault.address);
    await registry.addProxyContract(`${DAO_MEMBER_STORAGE_NAME}:Test panel`, daoMemberStorage.address);

    daoVault = await DAOVault.at(await registry.getDAOVault());
    daoMemberStorage = await DAOMemberStorage.at(await registry.getDAOMemberStorage("Test panel"));

    await daoVault.__DAOVault_init(registry.address);
    await daoMemberStorage.__DAOMemberStorage_init("Test panel", DAO_MEMBER_STORAGE_RESOURCE);

    const managerResource = await manager.PERMISSION_MANAGER_RESOURCE();
    DAOManagerCreate = [managerResource, [CREATE_PERMISSION]];
    DAOManagerIntegration = [managerResource, [INTEGRATION_PERMISSION]];

    await manager.addPermissionsToRole(DAOManagerCreateRole, [DAOManagerCreate], true);
    await manager.addPermissionsToRole(DAOManagerIntegrationRole, [DAOManagerIntegration], true);

    await registry.injectDependencies(DAO_VAULT_NAME);
    await registry.injectDependencies(`${DAO_MEMBER_STORAGE_NAME}:Test panel`);

    await manager.grantRoles(daoMemberStorage.address, [MASTER_ROLE]);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("basic access", () => {
    it("should not initialize twice", async () => {
      await truffleAssert.reverts(
        manager.__PermissionManager_init(registry.address, OWNER, "test", "Test panel"),
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("checkPermission", () => {
    it("should check permission", async () => {
      assert.equal(await manager.getResource(), await manager.PERMISSION_MANAGER_RESOURCE());

      assert.isFalse(await manager.checkPermission(USER1, CREATE_PERMISSION));

      await manager.grantRoles(USER1, [DAOManagerCreateRole]);

      assert.isTrue(await manager.checkPermission(USER1, CREATE_PERMISSION));
    });
  });

  describe("Add/Updated Veto Groups", () => {
    it("should add veto group", async () => {
      await truffleAssert.reverts(
        manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", daoMemberStorage.address, {
          from: USER1,
        }),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      await truffleAssert.passes(
        manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", daoMemberStorage.address, {
          from: OWNER,
        }),
        "passes"
      );

      await truffleAssert.reverts(
        manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", daoMemberStorage.address, {
          from: OWNER,
        }),
        "[QGDK-008004]-The veto group already exists."
      );

      await truffleAssert.passes(
        manager.addVetoGroup(registry.address, "Veto Registry", ZERO_ADDR, {
          from: OWNER,
        }),
        "passes"
      );

      const vetoGroup = await manager.getVetoGroupInfo(registry.address);
      assert.equal(vetoGroup.target, registry.address);
      assert.equal(vetoGroup.name, "Veto Registry");
      assert.equal(vetoGroup.linkedMemberStorage, ZERO_ADDR);
    });

    it("should add veto groups", async () => {
      await truffleAssert.reverts(
        manager.addVetoGroups(
          [
            {
              target: daoMemberStorage.address,
              name: "Veto Member Storage",
              linkedMemberStorage: daoMemberStorage.address,
            },
            {
              target: registry.address,
              name: "Veto Registry",
              linkedMemberStorage: ZERO_ADDR,
            },
          ],
          {
            from: USER1,
          }
        ),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      assert.isFalse(await manager.isVetoGroupExists(daoMemberStorage.address));

      await truffleAssert.passes(
        manager.addVetoGroups(
          [
            {
              target: daoMemberStorage.address,
              name: "Veto Member Storage",
              linkedMemberStorage: daoMemberStorage.address,
            },
            {
              target: registry.address,
              name: "Veto Registry",
              linkedMemberStorage: ZERO_ADDR,
            },
          ],
          {
            from: OWNER,
          }
        ),
        "passes"
      );

      assert.isTrue(await manager.isVetoGroupExists(daoMemberStorage.address));
    });

    it("should link new Member Storage to veto group", async () => {
      await truffleAssert.reverts(
        manager.addVetoGroup(registry.address, "Veto Member Storage", daoMemberStorage.address, {
          from: USER1,
        }),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      await truffleAssert.reverts(
        manager.linkStorageToVetoGroup(daoVoting.address, daoMemberStorage.address, {
          from: OWNER,
        }),
        "[QGDK-008003]-The veto group does not exists, impossible to link it with member storage."
      );

      assert.deepEqual(await manager.getExistingVetoGroupTargets(), []);

      await truffleAssert.passes(
        manager.addVetoGroup(registry.address, "Veto Member Storage", daoMemberStorage.address, {
          from: OWNER,
        }),
        "passes"
      );

      assert.deepEqual(await manager.getExistingVetoGroupTargets(), [registry.address]);

      const mockMemberStorage = await DAOMemberStorage.new();

      await truffleAssert.reverts(
        manager.linkStorageToVetoGroup(registry.address, mockMemberStorage.address, {
          from: USER1,
        }),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      let info = await manager.getVetoGroupInfo(registry.address);
      assert.equal(info.linkedMemberStorage, daoMemberStorage.address);

      await truffleAssert.passes(
        manager.linkStorageToVetoGroup(registry.address, mockMemberStorage.address, {
          from: OWNER,
        }),
        "passes"
      );

      info = await manager.getVetoGroupInfo(registry.address);
      assert.equal(info.linkedMemberStorage, mockMemberStorage.address);

      await truffleAssert.passes(
        manager.linkStorageToVetoGroup(registry.address, ZERO_ADDR, {
          from: OWNER,
        }),
        "passes"
      );

      info = await manager.getVetoGroupInfo(registry.address);
      assert.equal(info.linkedMemberStorage, ZERO_ADDR);
    });
  });

  describe("removeVetoGroup", () => {
    it("should remove veto group", async () => {
      await truffleAssert.reverts(
        manager.removeVetoGroup(daoMemberStorage.address, {
          from: USER1,
        }),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      await truffleAssert.reverts(
        manager.removeVetoGroup(daoMemberStorage.address, {
          from: OWNER,
        }),
        "[QGDK-008002]-The veto group does not exists, impossible to remove it."
      );

      assert.deepEqual(await manager.getUserGroups(USER1), []);

      await truffleAssert.passes(
        manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", daoMemberStorage.address, {
          from: OWNER,
        }),
        "passes"
      );
      await truffleAssert.passes(
        manager.removeVetoGroup(daoMemberStorage.address, {
          from: OWNER,
        }),
        "passes"
      );
    });

    it("should remove veto group with no linked storage", async () => {
      assert.deepEqual(await manager.getUserGroups(USER1), []);

      await truffleAssert.passes(
        manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", ZERO_ADDR, {
          from: OWNER,
        }),
        "passes"
      );
      await truffleAssert.passes(
        manager.removeVetoGroup(daoMemberStorage.address, {
          from: OWNER,
        }),
        "passes"
      );
    });
  });

  describe("configure functions", () => {
    it("initialConfiguration", async () => {
      await truffleAssert.reverts(
        manager.initialConfiguration(
          registry.address,
          daoVoting.address,
          GENERAL_VOTING_NAME,
          DefaultVotingParams.panelName,
          {
            from: USER1,
          }
        ),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      await truffleAssert.passes(
        manager.initialConfiguration(
          registry.address,
          daoVoting.address,
          GENERAL_VOTING_NAME,
          DefaultVotingParams.panelName,
          {
            from: OWNER,
          }
        ),
        "passes"
      );
    });

    it("confVotingModule", async () => {
      await truffleAssert.reverts(
        manager.confVotingModule(
          registry.address,
          GENERAL_VOTING_NAME,
          daoVoting.address,
          DefaultVotingParams.panelName,
          {
            from: USER1,
          }
        ),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      await truffleAssert.passes(
        manager.confVotingModule(
          registry.address,
          GENERAL_VOTING_NAME,
          daoVoting.address,
          DefaultVotingParams.panelName,
          {
            from: OWNER,
          }
        ),
        "passes"
      );
    });

    it("confMemberGroup", async () => {
      await truffleAssert.reverts(
        manager.confMemberGroup(registry.address, GENERAL_VOTING_NAME, DefaultVotingParams.panelName, {
          from: USER1,
        }),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      await truffleAssert.passes(
        manager.confMemberGroup(registry.address, GENERAL_VOTING_NAME, DefaultVotingParams.panelName, {
          from: OWNER,
        }),
        "passes"
      );
    });

    it("confExpertsGroups", async () => {
      await truffleAssert.reverts(
        manager.confExpertsGroups(EXPERTS_VOTING_NAME, DefaultVotingParams.panelName, {
          from: USER1,
        }),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      await truffleAssert.passes(
        manager.confExpertsGroups(EXPERTS_VOTING_NAME, DefaultVotingParams.panelName, {
          from: OWNER,
        }),
        "passes"
      );
    });

    it("confExternalModule", async () => {
      const treasuryModule = await TreasuryMock.new();
      const badModule = await BadExternalModule.new();

      await registry.addContract("DAO Treasury", treasuryModule.address);
      await registry.addContract("Bad Treasury", badModule.address);
      await registry.addContract("Non exist", ETHEREUM_ADDRESS);

      await truffleAssert.reverts(
        manager.confExternalModule(registry.address, "DAO Treasury", {
          from: USER1,
        }),
        "[QGDK-008006]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOManagerIntegrationRole]);

      await truffleAssert.reverts(
        manager.confExternalModule(registry.address, "DAO Treasury2", {
          from: USER1,
        }),
        "[QGDK-008000]-The module not found in the DAO Registry."
      );

      await truffleAssert.reverts(
        manager.confExternalModule(registry.address, "Bad Treasury", {
          from: USER1,
        }),
        "[QGDK-008001]-The target contract must follow integration documentation."
      );

      await truffleAssert.reverts(
        manager.confExternalModule(registry.address, "Non exist", {
          from: USER1,
        }),
        "[QGDK-008001]-The target contract must follow integration documentation."
      );

      await truffleAssert.passes(
        manager.confExternalModule(registry.address, "DAO Treasury", {
          from: USER1,
        }),
        "passes"
      );
    });
  });

  describe("getters", () => {
    describe("DAORegistry", () => {
      it("should correctly check access for hasPermission (Create)", async () => {
        await manager.addPermissionsToRole(DAORegistryRole1, [DAORegistryCreate], true);

        await assert.isFalse(await manager.hasPermission(USER1, DAO_REGISTRY_RESOURCE, CREATE_PERMISSION));

        await manager.grantRoles(USER1, [DAORegistryRole1]);

        await assert.isTrue(await manager.hasPermission(USER1, DAO_REGISTRY_RESOURCE, CREATE_PERMISSION));
      });

      it("should correctly check access for hasPermission (Update)", async () => {
        await manager.addPermissionsToRole(DAORegistryRole1, [DAORegistryUpdate], true);

        await assert.isFalse(await manager.hasPermission(USER1, DAO_REGISTRY_RESOURCE, UPDATE_PERMISSION));

        await manager.grantRoles(USER1, [DAORegistryRole1]);

        await assert.isTrue(await manager.hasPermission(USER1, DAO_REGISTRY_RESOURCE, UPDATE_PERMISSION));
      });

      it("should correctly check access for hasePermission (Delete)", async () => {
        await manager.addPermissionsToRole(DAORegistryRole1, [DAORegistryDelete], true);

        await assert.isFalse(await manager.hasPermission(USER1, DAO_REGISTRY_RESOURCE, DELETE_PERMISSION));

        await manager.grantRoles(USER1, [DAORegistryRole1]);

        await assert.isTrue(await manager.hasPermission(USER1, DAO_REGISTRY_RESOURCE, DELETE_PERMISSION));
      });
    });

    it("getVetoMembersCount", async () => {
      await manager.addVetoGroup(daoMemberStorage.address, "Veto Member Storage", ZERO_ADDR, {
        from: OWNER,
      });

      assert.equal(await manager.getVetoMembersCount(daoMemberStorage.address), 0);
      assert.deepEqual(await manager.getVetoGroupMembers(daoMemberStorage.address), []);

      await daoMemberStorage.addMember(USER2, { from: OWNER });
      await manager.linkStorageToVetoGroup(daoMemberStorage.address, daoMemberStorage.address, { from: OWNER });

      assert.deepEqual(await manager.getGroupRoles((await daoMemberStorage.getGroup())[0]), [
        "VetoGroupRoleFor:DAO_MEMBER_STORAGE_RESOURCE",
      ]);

      assert.equal(await manager.getVetoMembersCount(daoMemberStorage.address), 1);
      assert.deepEqual(await manager.getVetoGroupMembers(daoMemberStorage.address), [USER2]);

      await daoMemberStorage.addMember(USER1, { from: OWNER });

      assert.equal(await manager.getVetoMembersCount(daoMemberStorage.address), 2);
      assert.deepEqual(await manager.getVetoGroupMembers(daoMemberStorage.address), [USER2, USER1]);

      await truffleAssert.reverts(
        manager.getVetoMembersCount(ZERO_ADDR),
        "[QGDK-008005]-The target contract must implement the IDAOResource interface."
      );
    });
  });
});
