import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import {
  DAO_REGISTRY_NAME,
  DAO_MEMBER_STORAGE_NAME,
  CREATE_PERMISSION,
  DELETE_PERMISSION,
  MASTER_ROLE,
  EXPERTS_VOTING_NAME,
  getDAOPanelResource,
} from "../utils/constants";

import { PermissionManager, DAOMemberStorage } from "@ethers-v5";

describe("DAOMemberStorage", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const targetPanel = "Test Panel";

  let manager: PermissionManager;
  let daoMemberStorage: DAOMemberStorage;
  let daoMemberStorageResource: string;

  const DAOMemberStorageCreateRole = "SCR";
  const DAOMemberStorageDeleteRole = "SDR";

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    daoMemberStorage = await DAOMemberStorage.new();

    await registry.__DAORegistry_init(
      (
        await PermissionManager.new()
      ).address,
      OWNER,
      targetPanel,
      DAO_REGISTRY_NAME,
      "daoURI"
    );

    await registry.addPanel(targetPanel);

    manager = await PermissionManager.at(await registry.getPermissionManager());

    await manager.confMemberGroup(registry.address, EXPERTS_VOTING_NAME, targetPanel);
    await manager.confExpertsGroups(EXPERTS_VOTING_NAME, targetPanel);

    daoMemberStorageResource = getDAOPanelResource(DAO_MEMBER_STORAGE_NAME, targetPanel);
    await registry.addProxyContract(daoMemberStorageResource, daoMemberStorage.address);

    daoMemberStorage = await DAOMemberStorage.at(await registry.getContract(daoMemberStorageResource));

    await daoMemberStorage.__DAOMemberStorage_init(targetPanel, daoMemberStorageResource);
    await registry.injectDependencies(daoMemberStorageResource);

    const DAOMemberStorageCreate = [daoMemberStorageResource, [CREATE_PERMISSION]];
    const DAOMemberStorageDelete = [daoMemberStorageResource, [DELETE_PERMISSION]];

    await manager.addPermissionsToRole(DAOMemberStorageCreateRole, [DAOMemberStorageCreate], true);
    await manager.addPermissionsToRole(DAOMemberStorageDeleteRole, [DAOMemberStorageDelete], true);

    await manager.grantRoles(daoMemberStorage.address, [MASTER_ROLE]);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("only injector should set dependencies", async () => {
      await truffleAssert.reverts(
        daoMemberStorage.setDependencies(registry.address, "0x", { from: USER1 }),
        "Dependant: not an injector"
      );
    });

    it("should initialize only once", async () => {
      await truffleAssert.reverts(
        daoMemberStorage.__DAOMemberStorage_init(targetPanel, ""),
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("addMember/addMembers", () => {
    it("should add Member only with create permission", async () => {
      await truffleAssert.reverts(
        daoMemberStorage.addMember(USER1, { from: USER1 }),
        "[QGDK-004000]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOMemberStorageCreateRole]);

      assert.deepEqual(await registry.getAccountStatuses(USER1), [
        ["DAO Token Holder", "DAOGroup:Test Panel"],
        [false, false],
      ]);

      await truffleAssert.passes(daoMemberStorage.addMember(USER1, { from: USER1 }), "passes");

      assert.deepEqual(await registry.getAccountStatuses(USER1), [
        ["DAO Token Holder", "DAOGroup:Test Panel"],
        [false, true],
      ]);

      assert.deepEqual(await daoMemberStorage.getMembers(), [USER1]);
      assert.equal(await daoMemberStorage.getMembersCount(), 1);

      assert.isTrue(await daoMemberStorage.isMember(USER1));
      assert.isFalse(await daoMemberStorage.isMember(USER2));

      assert.deepEqual(await manager.getUserGroups(USER1), ["DAOExpertVotingGroup:Test Panel"]);
    });

    it("should add Members only with create permission", async () => {
      await truffleAssert.reverts(
        daoMemberStorage.addMembers([USER1, USER2, USER3], { from: USER1 }),
        "[QGDK-004000]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOMemberStorageCreateRole]);

      await truffleAssert.passes(daoMemberStorage.addMembers([USER1, USER2, USER3], { from: USER1 }), "passes");

      assert.deepEqual(await daoMemberStorage.getMembers(), [USER1, USER2, USER3]);

      assert.deepEqual(await manager.getUserGroups(USER1), ["DAOExpertVotingGroup:Test Panel"]);
      assert.deepEqual(await manager.getUserGroups(USER2), ["DAOExpertVotingGroup:Test Panel"]);
      assert.deepEqual(await manager.getUserGroups(USER3), ["DAOExpertVotingGroup:Test Panel"]);
    });
  });

  describe("removeMember/removeMembers", () => {
    beforeEach(async () => {
      await daoMemberStorage.addMembers([USER1, USER2, USER3], { from: OWNER });
    });

    it("should remove Member only with delete permission", async () => {
      await truffleAssert.reverts(
        daoMemberStorage.removeMember(USER2, { from: USER1 }),
        "[QGDK-004000]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOMemberStorageDeleteRole]);

      assert.isTrue(await daoMemberStorage.isMember(USER2));
      assert.deepEqual(await manager.getUserGroups(USER2), ["DAOExpertVotingGroup:Test Panel"]);

      await truffleAssert.passes(daoMemberStorage.removeMember(USER2, { from: USER1 }), "passes");
      assert.isFalse(await daoMemberStorage.isMember(USER2));

      assert.deepEqual(await daoMemberStorage.getMembers(), [USER1, USER3]);
      assert.deepEqual(await manager.getUserGroups(USER2), []);
    });

    it("should remove Members only with delete permission", async () => {
      await truffleAssert.reverts(
        daoMemberStorage.removeMembers([USER2, USER3], { from: USER1 }),
        "[QGDK-004000]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOMemberStorageDeleteRole]);

      assert.isTrue(await daoMemberStorage.isMember(USER2));
      assert.deepEqual(await manager.getUserGroups(USER2), ["DAOExpertVotingGroup:Test Panel"]);

      assert.deepEqual(await daoMemberStorage.getMembers(), [USER1, USER2, USER3]);
      await truffleAssert.passes(daoMemberStorage.removeMembers([USER2, USER3], { from: USER1 }), "passes");
      assert.isFalse(await daoMemberStorage.isMember(USER2));

      assert.deepEqual(await daoMemberStorage.getMembers(), [USER1]);
      assert.deepEqual(await manager.getUserGroups(USER2), []);
      assert.deepEqual(await manager.getUserGroups(USER1), ["DAOExpertVotingGroup:Test Panel"]);
    });
  });

  describe("checkPermission", () => {
    it("should check permission", async () => {
      assert.equal(await daoMemberStorage.getResource(), await daoMemberStorage.DAO_MEMBER_STORAGE_RESOURCE());

      assert.isFalse(await daoMemberStorage.checkPermission(USER1, CREATE_PERMISSION));
      assert.isFalse(await daoMemberStorage.checkPermission(USER1, DELETE_PERMISSION));

      await manager.grantRoles(USER1, [DAOMemberStorageCreateRole]);

      assert.isTrue(await daoMemberStorage.checkPermission(USER1, CREATE_PERMISSION));
      assert.isFalse(await daoMemberStorage.checkPermission(USER1, DELETE_PERMISSION));

      await manager.grantRoles(USER1, [DAOMemberStorageDeleteRole]);

      assert.isTrue(await daoMemberStorage.checkPermission(USER1, CREATE_PERMISSION));
      assert.isTrue(await daoMemberStorage.checkPermission(USER1, DELETE_PERMISSION));
    });
  });
});
