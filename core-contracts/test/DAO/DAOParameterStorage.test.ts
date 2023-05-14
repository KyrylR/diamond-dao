import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import {
  DAO_REGISTRY_NAME,
  DAO_PARAMETER_STORAGE_NAME,
  DELETE_PERMISSION,
  UPDATE_PERMISSION,
  ParameterType,
  getParameter,
  getDAOPanelResource,
} from "../utils/constants";

import { cast } from "@/test/utils/caster";

import { PermissionManager, DAOParameterStorage } from "@ethers-v5";

describe("DAOParameterStorage", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const targetPanel = "Test Panel";


  let manager: PermissionManager;
  let daoParameterStorage: DAOParameterStorage;
  let daoParameterStorageResource: string;

  const DAOParameterStorageUpdateRole = "SUR";
  const DAOParameterStorageDeleteRole = "SDR";

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    registry = await DAORegistry.new();
    daoParameterStorage = await DAOParameterStorage.new();

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

    daoParameterStorageResource = getDAOPanelResource(DAO_PARAMETER_STORAGE_NAME, targetPanel);
    await registry.addProxyContract(daoParameterStorageResource, daoParameterStorage.address);

    daoParameterStorage = await DAOParameterStorage.at(await registry.getContract(daoParameterStorageResource));

    await daoParameterStorage.__DAOParameterStorage_init(daoParameterStorageResource);
    await registry.injectDependencies(daoParameterStorageResource);

    const DAOParameterStorageUpdate = [daoParameterStorageResource, [UPDATE_PERMISSION]];
    const DAOParameterStorageDelete = [daoParameterStorageResource, [DELETE_PERMISSION]];

    await manager.addPermissionsToRole(DAOParameterStorageUpdateRole, [DAOParameterStorageUpdate], true);
    await manager.addPermissionsToRole(DAOParameterStorageDeleteRole, [DAOParameterStorageDelete], true);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("only injector should set dependencies", async () => {
      await truffleAssert.reverts(
        daoParameterStorage.setDependencies(registry.address, "0x", { from: USER1 }),
        "Dependant: not an injector"
      );
    });

    it("should initialize only once", async () => {
      await truffleAssert.reverts(
        daoParameterStorage.__DAOParameterStorage_init(""),
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("setDAOParameter/setDAOParameters", () => {
    it("should set parameter only with Create Permission", async () => {
      const parameter = getParameter("test", 1, ParameterType.UINT256);
      await truffleAssert.reverts(
        daoParameterStorage.setDAOParameter(parameter, { from: USER1 }),
        "[QGDK-005000]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);

      assert.deepEqual(await daoParameterStorage.getDAOParameters(), []);
      await daoParameterStorage.setDAOParameter(parameter, { from: USER1 });

      assert.deepEqual(cast(await daoParameterStorage.getDAOParameter("test")), parameter);

      await truffleAssert.reverts(
        daoParameterStorage.getDAOParameter("test2"),
        `DAOParameterStorage__ParameterNotFound("test2")`
      );
    });

    it("should set parameters only with Create Permission", async () => {
      let parameters = [
        getParameter("test", 1, ParameterType.UINT256),
        getParameter("test2", 2, ParameterType.UINT256),
      ];
      await truffleAssert.reverts(
        daoParameterStorage.setDAOParameters(parameters, { from: USER1 }),
        "[QGDK-005000]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);

      assert.deepEqual(await daoParameterStorage.getDAOParameters(), []);
      await daoParameterStorage.setDAOParameters(parameters, { from: USER1 });

      parameters = [getParameter("test", 1, ParameterType.UINT256), getParameter("test2", 2, ParameterType.UINT256)];

      assert.deepEqual(cast(await daoParameterStorage.getDAOParameters()), parameters);

      assert.deepEqual(cast(await daoParameterStorage.getDAOParameter("test")), parameters[0]);
      assert.deepEqual(cast(await daoParameterStorage.getDAOParameter("test2")), parameters[1]);
    });
  });

  describe("changeDAOParameter/changeDAOParameters", () => {
    it("should change parameter only with Update Permission", async () => {
      const parameter = getParameter("test", 1, ParameterType.UINT256);
      const parameter2 = getParameter("test", 2, ParameterType.UINT256);

      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);
      await daoParameterStorage.setDAOParameter(parameter, { from: USER1 });

      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);

      await daoParameterStorage.setDAOParameter(parameter2, { from: USER1 });

      assert.deepEqual(cast(await daoParameterStorage.getDAOParameter("test")), parameter2);
    });

    it("should change parameters only with Update Permission", async () => {
      const parameter1 = getParameter("test1", 1, ParameterType.UINT256);
      const parameter2 = getParameter("test2", 2, ParameterType.UINT256);

      const parameters = [parameter1, parameter2];

      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);
      await daoParameterStorage.setDAOParameters(parameters, { from: USER1 });

      let newParameters = [
        getParameter("test1", 10, ParameterType.UINT256),
        getParameter("test2", 20, ParameterType.UINT256),
      ];

      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);

      await daoParameterStorage.setDAOParameters(newParameters, { from: USER1 });

      newParameters = [
        getParameter("test1", 10, ParameterType.UINT256),
        getParameter("test2", 20, ParameterType.UINT256),
      ];

      assert.deepEqual(cast(await daoParameterStorage.getDAOParameter("test1")), newParameters[0]);
      assert.deepEqual(cast(await daoParameterStorage.getDAOParameter("test2")), newParameters[1]);
    });
  });

  describe("removeDAOParameter/removeDAOParameters", () => {
    it("should remove parameter only with Delete Permission", async () => {
      const parameter = getParameter("test", 1, ParameterType.UINT256);
      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);
      await daoParameterStorage.setDAOParameter(parameter, { from: USER1 });

      await truffleAssert.reverts(
        daoParameterStorage.removeDAOParameter("test", { from: USER1 }),
        "[QGDK-005000]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOParameterStorageDeleteRole]);

      await daoParameterStorage.removeDAOParameter("test", { from: USER1 });

      await truffleAssert.reverts(
        daoParameterStorage.removeDAOParameter("test", { from: USER1 }),
        `DAOParameterStorage__ParameterNotFound("test")`
      );

      assert.deepEqual(await daoParameterStorage.getDAOParameters(), []);
    });

    it("should remove parameters only with Delete Permission", async () => {
      const parameter1 = getParameter("test1", 1, ParameterType.UINT256);
      const parameter2 = getParameter("test2", 2, ParameterType.UINT256);

      const parameters = [parameter1, parameter2];

      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);
      await daoParameterStorage.setDAOParameters(parameters, { from: USER1 });

      await truffleAssert.reverts(
        daoParameterStorage.removeDAOParameters(["test1", "test2"], { from: USER1 }),
        "[QGDK-005000]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [DAOParameterStorageDeleteRole]);

      await daoParameterStorage.removeDAOParameters(["test1", "test2"], { from: USER1 });

      await truffleAssert.reverts(
        daoParameterStorage.removeDAOParameters(["test1", "test2"], { from: USER1 }),
        `DAOParameterStorage__ParameterNotFound("test1")`
      );

      assert.deepEqual(await daoParameterStorage.getDAOParameters(), []);
    });
  });

  describe("checkPermission", () => {
    it("should check permission", async () => {
      assert.equal(await daoParameterStorage.getResource(), await daoParameterStorage.DAO_PARAMETER_STORAGE_RESOURCE());

      assert.isFalse(await daoParameterStorage.checkPermission(USER1, UPDATE_PERMISSION));
      assert.isFalse(await daoParameterStorage.checkPermission(USER1, DELETE_PERMISSION));

      await manager.grantRoles(USER1, [DAOParameterStorageUpdateRole]);

      assert.isTrue(await daoParameterStorage.checkPermission(USER1, UPDATE_PERMISSION));
      assert.isFalse(await daoParameterStorage.checkPermission(USER1, DELETE_PERMISSION));

      await manager.grantRoles(USER1, [DAOParameterStorageDeleteRole]);

      assert.isTrue(await daoParameterStorage.checkPermission(USER1, UPDATE_PERMISSION));
      assert.isTrue(await daoParameterStorage.checkPermission(USER1, DELETE_PERMISSION));
    });
  });
});
