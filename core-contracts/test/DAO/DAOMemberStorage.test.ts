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
} from "../utils/constants";

import { PermissionManager, DAOMemberStorage, DiamondDAO, IRBAC } from "@ethers-v5";

import {
  buildFaucetCutsFromFuncSigs,
  DAOMemberStorageFuncSigs,
  PermissionManagerFuncSigs,
} from "@/test/utils/faucetCuts";

describe("DAOMemberStorage", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  let diamond: DiamondDAO;
  let manager: PermissionManager;
  let daoMemberStorage: DAOMemberStorage;

  const DAOMemberStorageCreateRole = "SCR";
  const DAOMemberStorageDeleteRole = "SDR";

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    const DiamondDAO = await ethers.getContractFactory("DiamondDAO");
    diamond = await DiamondDAO.deploy();

    const DAOMemberStorage = await ethers.getContractFactory("DAOMemberStorage");
    daoMemberStorage = await DAOMemberStorage.deploy();

    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    manager = await PermissionManager.deploy();

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
  });

  describe("addMember/addMembers", () => {
    it("should add Member only with create permission", async () => {
      await expect(daoMemberStorage.connect(USER1).addMember(USER1.address)).to.be.revertedWith(
        "DAOMemberStorage: The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1.address, [DAOMemberStorageCreateRole]);

      await daoMemberStorage.connect(USER1).addMember(USER1.address);

      expect(await daoMemberStorage.getMembers()).to.be.deep.equal([USER1.address]);
      expect(await daoMemberStorage.getMembersCount()).to.be.equal(1);

      expect(await daoMemberStorage.isMember(USER1.address)).to.be.true;
      expect(await daoMemberStorage.isMember(USER2.address)).to.be.false;

      expect(await manager.getUserGroups(USER1.address)).to.be.deep.equal(["DAOExpertVotingGroup:DAO Token Holder"]);
    });

    it("should add Members only with create permission", async () => {
      await expect(
        daoMemberStorage.connect(USER1).addMembers([USER1.address, USER2.address, USER3.address])
      ).to.be.revertedWith("DAOMemberStorage: The sender is not allowed to perform the action, access denied.");

      await manager.grantRoles(USER1.address, [DAOMemberStorageCreateRole]);

      await daoMemberStorage.connect(USER1).addMembers([USER1.address, USER2.address, USER3.address]);

      expect(await daoMemberStorage.getMembers()).to.be.deep.equal([USER1.address, USER2.address, USER3.address]);

      expect(await manager.getUserGroups(USER1.address)).to.be.deep.equal(["DAOExpertVotingGroup:DAO Token Holder"]);
      expect(await manager.getUserGroups(USER2.address)).to.be.deep.equal(["DAOExpertVotingGroup:DAO Token Holder"]);
      expect(await manager.getUserGroups(USER3.address)).to.be.deep.equal(["DAOExpertVotingGroup:DAO Token Holder"]);
    });
  });

  describe("removeMember/removeMembers", () => {
    beforeEach(async () => {
      await daoMemberStorage.addMembers([USER1.address, USER2.address, USER3.address]);
      expect(await daoMemberStorage.isMember(USER1.address)).to.be.true;
      expect(await daoMemberStorage.isMember(USER2.address)).to.be.true;
      expect(await daoMemberStorage.isMember(USER3.address)).to.be.true;
    });

    it("should remove Member only with delete permission", async () => {
      await expect(daoMemberStorage.connect(USER1).removeMember(USER2.address)).to.be.revertedWith(
        "DAOMemberStorage: The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1.address, [DAOMemberStorageDeleteRole]);

      expect(await daoMemberStorage.isMember(USER2.address)).to.be.true;
      expect(await manager.getUserGroups(USER2.address)).to.be.deep.equal(["DAOExpertVotingGroup:DAO Token Holder"]);

      await daoMemberStorage.connect(USER1).removeMember(USER2.address);
      expect(await daoMemberStorage.isMember(USER2.address)).to.be.false;

      expect(await daoMemberStorage.getMembers()).to.be.deep.equal([USER1.address, USER3.address]);
      expect(await manager.getUserGroups(USER2.address)).to.be.deep.equal([]);
    });

    it("should remove Members only with delete permission", async () => {
      await expect(daoMemberStorage.connect(USER1).removeMembers([USER2.address, USER3.address])).to.be.revertedWith(
        "DAOMemberStorage: The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1.address, [DAOMemberStorageDeleteRole]);

      expect(await daoMemberStorage.isMember(USER2.address)).to.be.true;
      expect(await manager.getUserGroups(USER2.address)).to.be.deep.equal(["DAOExpertVotingGroup:DAO Token Holder"]);

      expect(await daoMemberStorage.getMembers()).to.be.deep.equal([USER1.address, USER2.address, USER3.address]);
      await daoMemberStorage.connect(USER1).removeMembers([USER2.address, USER3.address]);
      expect(await daoMemberStorage.isMember(USER2.address)).to.be.false;

      expect(await daoMemberStorage.getMembers()).to.be.deep.equal([USER1.address]);
      expect(await manager.getUserGroups(USER2.address)).to.be.deep.equal([]);
      expect(await manager.getUserGroups(USER1.address)).to.be.deep.equal(["DAOExpertVotingGroup:DAO Token Holder"]);
    });
  });
});
