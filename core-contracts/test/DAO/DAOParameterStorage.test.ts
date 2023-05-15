import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import {
  DAO_PARAMETER_STORAGE_NAME,
  DELETE_PERMISSION,
  UPDATE_PERMISSION,
  ParameterType,
  getParameter,
  DAO_PERMISSION_MANAGER_NAME,
  DAO_RESERVED_NAME,
  VOTING_NAME,
} from "../utils/constants";

import { cast } from "@/test/utils/caster";

import { PermissionManager, DAOParameterStorage, IRBAC, DiamondDAO } from "@ethers-v5";

import {
  buildFaucetCutsFromFuncSigs,
  DAOParameterStorageFuncSigs,
  PermissionManagerFuncSigs,
} from "@/test/utils/faucetCuts";

describe("DAOParameterStorage", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  let diamond: DiamondDAO;
  let manager: PermissionManager;
  let daoParameterStorage: DAOParameterStorage;

  const DAOParameterStorageUpdateRole = "SUR";
  const DAOParameterStorageDeleteRole = "SDR";

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    const DiamondDAO = await ethers.getContractFactory("DiamondDAO");
    diamond = await DiamondDAO.deploy();

    const DAOParameterStorage = await ethers.getContractFactory("DAOParameterStorage");
    daoParameterStorage = await DAOParameterStorage.deploy();

    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    manager = await PermissionManager.deploy();

    const parameterStorageFaucetCuts = buildFaucetCutsFromFuncSigs(
      DAOParameterStorageFuncSigs,
      daoParameterStorage.address,
      0
    );
    const permissionManagerFaucetCuts = buildFaucetCutsFromFuncSigs(PermissionManagerFuncSigs, manager.address, 0);

    await diamond.diamondCut(parameterStorageFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(permissionManagerFaucetCuts, ethers.constants.AddressZero, "0x");

    daoParameterStorage = await DAOParameterStorage.attach(diamond.address);
    manager = await PermissionManager.attach(diamond.address);

    await manager.__PermissionManager_init(OWNER.address, DAO_PERMISSION_MANAGER_NAME, DAO_RESERVED_NAME);
    await daoParameterStorage.__DAOParameterStorage_init(DAO_PARAMETER_STORAGE_NAME);

    await manager.confMemberGroup(VOTING_NAME, DAO_RESERVED_NAME);
    await manager.confExpertsGroups(VOTING_NAME, DAO_RESERVED_NAME);

    const DAOParameterStorageDelete: IRBAC.ResourceWithPermissionsStruct[] = [
      {
        resource: DAO_PARAMETER_STORAGE_NAME,
        permissions: [DELETE_PERMISSION],
      },
    ];
    const DAOParameterStorageUpdate: IRBAC.ResourceWithPermissionsStruct[] = [
      {
        resource: DAO_PARAMETER_STORAGE_NAME,
        permissions: [UPDATE_PERMISSION],
      },
    ];

    await manager.addPermissionsToRole(DAOParameterStorageUpdateRole, DAOParameterStorageUpdate, true);
    await manager.addPermissionsToRole(DAOParameterStorageDeleteRole, DAOParameterStorageDelete, true);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("should initialize only once", async () => {
      await expect(daoParameterStorage.__DAOParameterStorage_init("")).to.be.revertedWith(
        "DAOParameterStorage: already initialized"
      );
    });
  });

  describe("setDAOParameter/setDAOParameters", () => {
    it("should set parameter only with Create Permission", async () => {
      const parameter = getParameter("test", 1, ParameterType.UINT256);

      await expect(daoParameterStorage.connect(USER1).setDAOParameter(parameter)).to.be.revertedWith(
        "DAOParameterStorage: The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1.address, [DAOParameterStorageUpdateRole]);

      expect(await daoParameterStorage.getDAOParameters()).to.be.empty;
      await daoParameterStorage.connect(USER1).setDAOParameter(parameter);

      expect(cast(await daoParameterStorage.getDAOParameter("test"))).to.deep.equal(parameter);

      await expect(daoParameterStorage.getDAOParameter("test2")).to.be.rejectedWith(
        `DAOParameterStorage__ParameterNotFound`
      );
    });

    it("should set parameters only with Create Permission", async () => {
      const parameter1 = getParameter("test1", 1, ParameterType.UINT256);
      const parameter2 = getParameter("test2", 2, ParameterType.UINT256);

      await expect(daoParameterStorage.connect(USER1).setDAOParameters([parameter1, parameter2])).to.be.revertedWith(
        "DAOParameterStorage: The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1.address, [DAOParameterStorageUpdateRole]);

      expect(await daoParameterStorage.getDAOParameters()).to.be.empty;
      await daoParameterStorage.connect(USER1).setDAOParameters([parameter1, parameter2]);

      expect(cast(await daoParameterStorage.getDAOParameter("test1"))).to.deep.equal(parameter1);
      expect(cast(await daoParameterStorage.getDAOParameter("test2"))).to.deep.equal(parameter2);
    });
  });

  describe("changeDAOParameter/changeDAOParameters", () => {
    it("should change parameter only with Update Permission", async () => {
      const parameter = getParameter("test", 1, ParameterType.UINT256);
      const parameter2 = getParameter("test", 2, ParameterType.UINT256);

      await manager.grantRoles(USER1.address, [DAOParameterStorageUpdateRole]);
      expect(await daoParameterStorage.getDAOParameters()).to.be.empty;

      await daoParameterStorage.connect(USER1).setDAOParameter(parameter);
      expect(cast(await daoParameterStorage.getDAOParameter("test"))).to.deep.equal(parameter);

      await daoParameterStorage.connect(USER1).setDAOParameter(parameter2);
      expect(cast(await daoParameterStorage.getDAOParameter("test"))).to.deep.equal(parameter2);
    });

    it("should change parameters only with Update Permission", async () => {
      const parameter1 = getParameter("test1", 1, ParameterType.UINT256);
      const parameter2 = getParameter("test2", 2, ParameterType.UINT256);

      const parameters = [parameter1, parameter2];

      await manager.grantRoles(USER1.address, [DAOParameterStorageUpdateRole]);
      await daoParameterStorage.connect(USER1).setDAOParameters(parameters);

      expect(cast(await daoParameterStorage.getDAOParameter("test1"))).to.deep.equal(parameter1);
      expect(cast(await daoParameterStorage.getDAOParameter("test2"))).to.deep.equal(parameter2);

      let newParameters = [
        getParameter("test1", 10, ParameterType.UINT256),
        getParameter("test2", 20, ParameterType.UINT256),
      ];

      await daoParameterStorage.connect(USER1).setDAOParameters(newParameters);

      expect(cast(await daoParameterStorage.getDAOParameter("test1"))).to.deep.equal(newParameters[0]);
      expect(cast(await daoParameterStorage.getDAOParameter("test2"))).to.deep.equal(newParameters[1]);
    });
  });

  describe("removeDAOParameter/removeDAOParameters", () => {
    it("should remove parameter only with Delete Permission", async () => {
      const parameter = getParameter("test", 1, ParameterType.UINT256);
      await manager.grantRoles(USER1.address, [DAOParameterStorageUpdateRole]);
      await daoParameterStorage.connect(USER1).setDAOParameter(parameter);

      await expect(daoParameterStorage.connect(USER1).removeDAOParameter("test")).to.be.revertedWith(
        "DAOParameterStorage: The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1.address, [DAOParameterStorageDeleteRole]);

      await daoParameterStorage.connect(USER1).removeDAOParameter("test");

      await expect(daoParameterStorage.connect(USER1).removeDAOParameter("test")).to.be.rejectedWith(
        `DAOParameterStorage__ParameterNotFound`
      );

      expect(await daoParameterStorage.getDAOParameters()).to.be.empty;
    });

    it("should remove parameters only with Delete Permission", async () => {
      const parameter1 = getParameter("test1", 1, ParameterType.UINT256);
      const parameter2 = getParameter("test2", 2, ParameterType.UINT256);

      const parameters = [parameter1, parameter2];

      await manager.grantRoles(USER1.address, [DAOParameterStorageUpdateRole]);
      await daoParameterStorage.connect(USER1).setDAOParameters(parameters);

      await expect(daoParameterStorage.connect(USER1).removeDAOParameters(["test1", "test2"])).to.be.revertedWith(
        "DAOParameterStorage: The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1.address, [DAOParameterStorageDeleteRole]);

      await daoParameterStorage.connect(USER1).removeDAOParameters(["test1", "test2"]);

      await expect(daoParameterStorage.connect(USER1).removeDAOParameters(["test1", "test2"])).to.be.rejectedWith(
        `DAOParameterStorage__ParameterNotFound`
      );

      expect(await daoParameterStorage.getDAOParameters()).to.be.empty;
    });
  });
});
