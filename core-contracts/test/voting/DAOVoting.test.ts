import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import {
  MASTER_ROLE,
  DAO_MEMBER_STORAGE_NAME,
  DAO_PARAMETER_STORAGE_NAME,
  CREATE_VOTING_PERMISSION,
  VOTE_PERMISSION,
  VETO_PERMISSION,
  TEN_PERCENTAGE,
  FIFTY_PERCENTAGE,
  ONE_HUNDRED_PERCENTAGE,
  DefaultERC20Params,
  DefaultERC721Params,
  VOTING_NAME,
  getDAOPanelResource,
  ERC20_NAME,
  ERC721_NAME,
  DefaultSBTParams,
  DAO_PERMISSION_MANAGER_NAME,
  DAO_RESERVED_NAME,
} from "../utils/constants";

import { toBN } from "@/scripts/utils/utils";
import { setTime } from "@/test/helpers/block-helper";
import { cast } from "@/test/utils/caster";

import {
  SBT,
  ERC20Extended,
  ERC721Extended,
  DAOVault,
  DAOMemberStorage,
  DAOVoting,
  PermissionManager,
  DAOParameterStorage,
  IRBAC,
  DiamondDAO,
} from "@ethers-v5";
import {
  buildFaucetCutsFromFuncSigs,
  DAOMemberStorageFuncSigs,
  DAOParameterStorageFuncSigs,
  DAOVaultFuncSigs,
  DAOVotingFuncSigs,
  PermissionManagerFuncSigs,
} from "@/test/utils/faucetCuts";

describe("DAOVoting", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let Expert1: SignerWithAddress;
  let Expert2: SignerWithAddress;
  let Expert3: SignerWithAddress;

  let sbt: SBT;
  let erc20: ERC20Extended;
  let erc721: ERC721Extended;

  let daoVault: DAOVault;
  let diamond: DiamondDAO;
  let manager: PermissionManager;
  let memberStorage: DAOMemberStorage;
  let parameterStorage: DAOParameterStorage;

  let daoVoting: DAOVoting;

  let votingResource: string;
  let managerResource: string;
  let memberStorageResource: string;
  let parameterStorageResource: string;

  const DAOVotingRole = "VR";

  let defaultVotingSituation: any;

  before("setup", async () => {
    [OWNER, USER1, USER2, Expert1, Expert2, Expert3] = await ethers.getSigners();

    const DiamondDAO = await ethers.getContractFactory("DiamondDAO");
    diamond = await DiamondDAO.deploy();

    const DAOVault = await ethers.getContractFactory("DAOVault");
    daoVault = await DAOVault.deploy();

    const DAOParameterStorage = await ethers.getContractFactory("DAOParameterStorage");
    parameterStorage = await DAOParameterStorage.deploy();

    const DAOMemberStorage = await ethers.getContractFactory("DAOMemberStorage");
    memberStorage = await DAOMemberStorage.deploy();

    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    manager = await PermissionManager.deploy();

    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    daoVoting = await DAOVoting.deploy();

    const ERC20 = await ethers.getContractFactory("ERC20Extended");
    erc20 = await ERC20.deploy();
    await erc20.__ERC20_init(DefaultERC20Params, ERC20_NAME);

    const ERC721 = await ethers.getContractFactory("ERC721Extended");
    erc721 = await ERC721.deploy();
    await erc721.__ERC721_init(DefaultERC721Params, ERC721_NAME);

    const SBT = await ethers.getContractFactory("SBT");
    sbt = await SBT.deploy();
    await sbt.__SBT_init(DefaultSBTParams, ERC20_NAME);

    const votingFaucetCuts = buildFaucetCutsFromFuncSigs(DAOVotingFuncSigs, daoVoting.address, 0);
    const memberStorageFaucetCuts = buildFaucetCutsFromFuncSigs(DAOMemberStorageFuncSigs, memberStorage.address, 0);
    const parameterStorageFaucetCuts = buildFaucetCutsFromFuncSigs(
      DAOParameterStorageFuncSigs,
      parameterStorage.address,
      0
    );
    const daoVaultFaucetCuts = buildFaucetCutsFromFuncSigs(DAOVaultFuncSigs, daoVault.address, 0);
    const permissionManagerFaucetCuts = buildFaucetCutsFromFuncSigs(PermissionManagerFuncSigs, manager.address, 0);

    await diamond.diamondCut(votingFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(memberStorageFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(parameterStorageFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(daoVaultFaucetCuts, ethers.constants.AddressZero, "0x");
    await diamond.diamondCut(permissionManagerFaucetCuts, ethers.constants.AddressZero, "0x");

    daoVault = await DAOVault.attach(diamond.address);
    manager = await PermissionManager.attach(diamond.address);
    memberStorage = await DAOMemberStorage.attach(diamond.address);
    parameterStorage = await DAOParameterStorage.attach(diamond.address);
    daoVoting = await DAOVoting.attach(diamond.address);

    managerResource = getDAOPanelResource(DAO_PERMISSION_MANAGER_NAME, DAO_RESERVED_NAME);
    votingResource = getDAOPanelResource(VOTING_NAME, DAO_RESERVED_NAME);
    memberStorageResource = getDAOPanelResource(DAO_MEMBER_STORAGE_NAME, DAO_RESERVED_NAME);
    parameterStorageResource = getDAOPanelResource(DAO_PARAMETER_STORAGE_NAME, DAO_RESERVED_NAME);

    await daoVoting.__DAOVoting_init(DAO_RESERVED_NAME, erc20.address, votingResource);
    await manager.__PermissionManager_init(OWNER.address, managerResource, DAO_RESERVED_NAME);
    await memberStorage.__DAOMemberStorage_init(DAO_RESERVED_NAME, memberStorageResource);
    await parameterStorage.__DAOParameterStorage_init(parameterStorageResource);
    await daoVault.__DAOVault_init();

    await manager.initialConfiguration(daoVoting.address, VOTING_NAME, DAO_RESERVED_NAME);

    defaultVotingSituation = "Membership voting";
    await daoVoting.createDAOVotingSituation({
      votingSituationName: "Membership voting",
      votingValues: {
        votingPeriod: 60,
        vetoPeriod: 60,
        proposalExecutionPeriod: 60,
        requiredQuorum: TEN_PERCENTAGE,
        requiredMajority: FIFTY_PERCENTAGE,
        requiredVetoQuorum: FIFTY_PERCENTAGE,
        votingType: 0,
        votingTarget: `${memberStorageResource}`,
        votingMinAmount: 100,
      },
    });

    await daoVoting.createDAOVotingSituation({
      votingSituationName: "General voting",
      votingValues: {
        votingPeriod: 60,
        vetoPeriod: 60,
        proposalExecutionPeriod: 60,
        requiredQuorum: TEN_PERCENTAGE,
        requiredMajority: FIFTY_PERCENTAGE,
        requiredVetoQuorum: FIFTY_PERCENTAGE,
        votingType: 0,
        votingTarget: `${votingResource}`,
        votingMinAmount: 100,
      },
    });

    const votingPesWithPerms: IRBAC.ResourceWithPermissionsStruct[] = [
      {
        resource: votingResource,
        permissions: [CREATE_VOTING_PERMISSION, VOTE_PERMISSION, VETO_PERMISSION],
      },
    ];

    await manager.addPermissionsToRole(DAOVotingRole, votingPesWithPerms, true);

    await erc20.mintTo(USER1.address, "1000");
    await erc20.mintTo(USER2.address, "1000");
    await erc20.mintTo(Expert1.address, "1000");
    await erc20.mintTo(Expert2.address, "1000");
    await erc20.mintTo(Expert3.address, "1000");
    await erc20.mintTo(OWNER.address, "1000");
    await erc20.connect(USER1).approve(daoVault.address, "1000");
    await erc20.connect(USER2).approve(daoVault.address, "1000");
    await erc20.connect(Expert1).approve(daoVault.address, "1000");
    await erc20.connect(Expert2).approve(daoVault.address, "1000");
    await erc20.connect(Expert3).approve(daoVault.address, "1000");
    await erc20.approve(daoVault.address, "1000");

    await erc721.mintTo(USER1.address, 0, "some_uri");
    await erc721.mintTo(USER2.address, 1, "some_uri");
    await erc721.mintTo(OWNER.address, 2, "some_uri");
    await erc721.connect(USER1).setApprovalForAll(daoVault.address, true);
    await erc721.connect(USER2).setApprovalForAll(daoVault.address, true);
    await erc721.setApprovalForAll(daoVault.address, true);

    await manager.grantRoles(daoVault.address, [MASTER_ROLE]);
    await manager.grantRoles(memberStorage.address, [MASTER_ROLE]);

    await daoVault.depositERC20(erc20.address, 100);
    await daoVault.depositNFT(erc721.address, 2);

    await sbt.mintTo(USER1.address, 0, "some_uri", 0);
    await sbt.mintTo(USER2.address, 1, "some_uri", 0);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  function encodeAddMemberFunc(member: any) {
    let encoder = new ethers.utils.Interface(require("./DAOMemberStorage.json"));
    return encoder.encodeFunctionData("addMember", [member]);
  }

  describe("access", () => {
    it("should initialize only once", async () => {
      await expect(daoVoting.__DAOVoting_init(DAO_RESERVED_NAME, erc20.address, votingResource)).to.be.revertedWith(
        "DAOVoting: already initialized"
      );
    });
  });

  describe("createDAOVotingSituation", () => {
    it("should initialize voting", async () => {
      await expect(
        daoVoting.connect(USER1).createDAOVotingSituation({
          votingSituationName: "general",
          votingValues: {
            votingPeriod: 60,
            vetoPeriod: 60,
            proposalExecutionPeriod: 60,
            requiredQuorum: TEN_PERCENTAGE,
            requiredMajority: TEN_PERCENTAGE,
            requiredVetoQuorum: FIFTY_PERCENTAGE,
            votingType: 0,
            votingTarget: managerResource,
            votingMinAmount: 100,
          },
        })
      ).to.be.revertedWith("DAOVoting: The sender is not allowed to perform the action, access denied.");

      await daoVoting.createDAOVotingSituation({
        votingSituationName: "new-one",
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: TEN_PERCENTAGE,
          requiredMajority: TEN_PERCENTAGE,
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 0,
          votingTarget: managerResource,
          votingMinAmount: 100,
        },
      });
    });
  });

  describe("removeVotingSituation", () => {
    it("should remove voting situation", async () => {
      await expect(daoVoting.removeVotingSituation("new-one")).to.be.revertedWith(
        "DAOVoting: The voting situation does not exist."
      );

      await daoVoting.createDAOVotingSituation({
        votingSituationName: "new-one",
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: TEN_PERCENTAGE,
          requiredMajority: TEN_PERCENTAGE,
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 2,
          votingTarget: managerResource,
          votingMinAmount: 99,
        },
      });

      await expect(daoVoting.connect(USER1).removeVotingSituation("new-one")).to.be.revertedWith(
        "DAOVoting: The sender is not allowed to perform the action, access denied."
      );

      await expect(
        daoVoting.createDAOVotingSituation({
          votingSituationName: "new-one",
          votingValues: {
            votingPeriod: 60,
            vetoPeriod: 60,
            proposalExecutionPeriod: 60,
            requiredQuorum: TEN_PERCENTAGE,
            requiredMajority: TEN_PERCENTAGE,
            requiredVetoQuorum: FIFTY_PERCENTAGE,
            votingType: 0,
            votingTarget: managerResource,
            votingMinAmount: 100,
          },
        })
      ).to.be.revertedWith("DAOVoting: The voting situation already exists.");

      expect(await daoVoting.getVotingSituations()).to.be.deep.equal([
        "Membership voting",
        "General voting",
        "new-one",
      ]);

      expect(cast(await daoVoting.getVotingSituationInfo("new-one"))).to.be.deep.equal({
        votingPeriod: 60,
        vetoPeriod: 60,
        proposalExecutionPeriod: 60,
        requiredQuorum: TEN_PERCENTAGE,
        requiredMajority: TEN_PERCENTAGE,
        requiredVetoQuorum: FIFTY_PERCENTAGE,
        votingType: 2,
        votingTarget: managerResource,
        votingMinAmount: 99,
      });

      await daoVoting.removeVotingSituation("new-one");

      expect(await daoVoting.getVotingSituations()).to.be.deep.equal(["Membership voting", "General voting"]);
    });
  });

  describe("createProposal", () => {
    it("should create proposal", async () => {
      await expect(
        daoVoting
          .connect(USER1)
          .createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1.address))
      ).to.be.revertedWith("DAOVoting: The sender is not allowed to perform the action, access denied.");

      await manager.grantRoles(USER1.address, [DAOVotingRole]);

      await expect(
        daoVoting
          .connect(USER1)
          .createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1.address))
      ).to.be.revertedWith("DAOVoting: The sender is not allowed to perform the action on the target, access denied.");

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(0, "Proposal status should be not exist");

      await expect(
        daoVoting.connect(USER1).createProposal("nothing", "test remark", encodeAddMemberFunc(USER1.address))
      ).to.be.revertedWith("DAOVoting: The voting situation does not exist, impossible to create a proposal.");

      await daoVault.connect(USER1).depositERC20(erc20.address, 1);

      await expect(
        daoVoting
          .connect(USER1)
          .createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1.address))
      ).to.be.revertedWith("DAOVoting: The user voting power is too low to create a proposal.");

      await daoVault.connect(USER1).depositERC20(erc20.address, 999);

      await daoVoting
        .connect(USER1)
        .createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1.address));

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(1, "Proposal status should be pending");

      const proposal = await daoVoting.getProposal(0);
      expect(proposal.remark).to.be.equal("test remark");
      expect(proposal.callData).to.be.equal(encodeAddMemberFunc(USER1.address));
      expect(proposal.target).to.be.equal(memberStorageResource);
      expect(proposal.executed).to.be.equal(false);
      expect(proposal["counters"].votedFor).to.be.equal(0);
      expect(proposal["counters"].votedAgainst).to.be.equal(0);
      expect(proposal["counters"].vetoesCount).to.be.equal(0);
      expect(proposal["params"].votingStartTime).to.be.equal(0);
      expect(proposal["params"].votingEndTime).to.be.equal(proposal["params"].vetoEndTime);
      expect(proposal["params"].requiredQuorum).to.be.equal(TEN_PERCENTAGE);
    });
  });

  describe("voting process", () => {
    beforeEach("setup", async () => {
      await daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1.address));
    });

    it("should change voting token", async () => {
      await expect(daoVoting.connect(USER1).changeVotingToken(erc20.address)).to.be.revertedWith(
        "DAOVoting: The sender is not allowed to perform the action, access denied."
      );

      expect(await daoVoting.getVotingToken()).to.be.equal(erc20.address);

      await daoVoting.changeVotingToken(sbt.address);

      expect(await daoVoting.getVotingToken()).to.be.equal(sbt.address);
    });

    it("should vote for", async () => {
      await expect(daoVoting.connect(USER1).voteFor(0)).to.be.revertedWith(
        "DAOVoting: The sender is not allowed to perform the action, access denied."
      );

      await manager.addUserToGroups(USER1.address, [`DAOGroup:${DAO_RESERVED_NAME}`]);

      await expect(daoVoting.connect(USER1).voteFor(1)).to.be.revertedWith("DAOVoting: The proposal does not exist.");

      await expect(daoVoting.connect(USER1).voteFor(0)).to.be.revertedWith("DAOVoting: The user has no voting power.");

      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await daoVoting.connect(USER1).voteFor(0);

      const proposal = await daoVoting.getProposal(0);
      expect(proposal["counters"].votedFor).to.be.equal(1000);
      expect(proposal["counters"].votedAgainst).to.be.equal(0);
      expect(proposal["counters"].vetoesCount).to.be.equal(0);

      await expect(daoVoting.connect(USER1).voteFor(0)).to.be.revertedWith("DAOVoting: The user has already voted.");
    });

    it("should vote against", async () => {
      await expect(daoVoting.connect(USER1).voteAgainst(0)).to.be.revertedWith(
        "DAOVoting: The sender is not allowed to perform the action, access denied."
      );

      await daoVault.connect(USER1).depositERC20(erc20.address, 700);

      await daoVoting.connect(USER1).voteAgainst(0);

      const proposal = await daoVoting.getProposal(0);
      expect(proposal["counters"].votedFor).to.be.equal(0);
      expect(proposal["counters"].votedAgainst).to.be.equal(700);
      expect(proposal["counters"].vetoesCount).to.be.equal(0);

      await setTime(Number(proposal["params"].votingEndTime) + 10);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(2, "should be REJECTED (2)");
    });

    it("should execute proposal in the end", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await daoVoting.connect(USER1).voteFor(0);

      await expect(daoVoting.connect(USER1).executeProposal(0)).to.be.revertedWith(
        "DAOVoting: The proposal must be passed to be executed."
      );

      let proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(4, "should be PASSED (4)");

      await expect(daoVoting.connect(USER1).voteFor(0)).to.be.revertedWith(
        "DAOVoting: The proposal must be pending to be voted."
      );

      await daoVoting.executeProposal(0);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(5, "should be EXECUTED (5)");
    });

    it("should not execute proposal if quorum is not reached", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 100);

      await daoVoting.connect(USER1).voteFor(0);

      let proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(2, "should be REJECTED (2)");
    });

    it("should be expired proposal if it wasn't executed", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await daoVoting.connect(USER1).voteFor(0);

      const proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(4, "should be PASSED (4)");

      await setTime(Number(proposal["params"].votingEndTime) + 100);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(6, "should be EXPIRED (6)");
    });

    it("should not execute proposal with invalid data", async () => {
      await daoVoting.createProposal(defaultVotingSituation, "test remark", "0x00");

      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await daoVoting.connect(USER1).voteFor(1);

      const proposal = await daoVoting.getProposal(1);
      await setTime(Number(proposal["params"].vetoEndTime) + 10);

      expect(await daoVoting.getProposalStatus(1)).to.be.equal(4, "should be PASSED (4)");

      await expect(daoVoting.executeProposal(1), "DAOVoting: The proposal execution failed.");

      let list = await daoVoting.getProposalList(0, 1);
      expect(list.length).to.be.equal(1);
      expect(list[0].id).to.be.equal(1);

      list = await daoVoting.getProposalList(0, 2);
      expect(list.length).to.be.equal(2);
      expect(list[0].id).to.be.equal(1);
      expect(list[1].id).to.be.equal(0);

      list = await daoVoting.getProposalList(1, 20);
      expect(list.length).to.be.equal(1);
      expect(list[0].id).to.be.equal(0);

      list = await daoVoting.getProposalList(300, 20);
      expect(list.length).to.be.equal(0);
    });
  });

  describe("veto process", () => {
    beforeEach("setup", async () => {
      await manager.addVetoGroup(memberStorageResource, "Veto Member Storage", memberStorage.address);

      await memberStorage.addMember(Expert1.address);
      await memberStorage.addMember(Expert2.address);
      await memberStorage.addMember(Expert3.address);

      await daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1.address));
    });

    it("should veto proposal", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await daoVoting.connect(USER1).voteFor(0);

      await expect(daoVoting.connect(Expert1).veto(0)).to.be.revertedWith(
        "DAOVoting: The proposal must be accepted to be vetoed."
      );

      const proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);
      expect(await daoVoting.getProposalStatus(0)).to.be.equal(3, "should be ACCEPTED (3)");

      await expect(daoVoting.connect(USER1).veto(0)).to.be.revertedWith(
        "DAOVoting: The sender is not allowed to perform the action on the target, access denied."
      );

      await daoVoting.connect(Expert1).veto(0);

      const proposalStats = await daoVoting.getProposalVotingStats(0);
      expect(proposalStats.requiredQuorum).to.be.equal(TEN_PERCENTAGE);

      const overallVotingPower = await daoVault.getTokenSupply(await daoVoting.getVotingToken());
      const expectedQuorum = toBN(proposal["counters"].votedFor.toString())
        .plus(proposal["counters"].votedAgainst.toString())
        .div(toBN(overallVotingPower.toString()));

      expect(Number(proposalStats.currentQuorum)).to.be.approximately(
        expectedQuorum.times(toBN(10).pow(27)).toNumber(),
        10 ** 12
      );
      expect(proposalStats.requiredMajority).to.be.equal(FIFTY_PERCENTAGE);
      expect(proposalStats.currentMajority).to.be.equal(ONE_HUNDRED_PERCENTAGE);
      expect(proposalStats.currentVetoQuorum).to.be.equal("3".repeat(27));
      expect(proposalStats.requiredVetoQuorum).to.be.equal(FIFTY_PERCENTAGE);

      await expect(daoVoting.connect(Expert1).veto(0)).to.be.revertedWith(
        "DAOVoting: The eligible user has already vetoed."
      );

      await daoVoting.connect(Expert2).veto(0);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(2, "should be REJECTED (2)");
    });
  });

  describe("General voting", () => {
    beforeEach("setup", async () => {
      await daoVoting.createProposal("General voting", "test remark", "0x");
    });

    it("should vote for/against and execute", async () => {
      await expect(daoVoting.createProposal("Membership voting", "test remark", "0x")).to.be.revertedWith(
        "DAOVoting: The general voting must be called on the Voting contract."
      );

      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await daoVoting.connect(USER1).voteFor(0);

      let proposal = await daoVoting.getProposal(0);
      expect(proposal["counters"].votedFor).to.be.equal(1000);
      expect(proposal["counters"].votedAgainst).to.be.equal(0);
      expect(proposal["counters"].vetoesCount).to.be.equal(0);

      await expect(daoVoting.connect(USER1).voteFor(0)).to.be.revertedWith("DAOVoting: The user has already voted.");

      proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(4, "should be PASSED (4)");

      await daoVoting.executeProposal(0);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(5, "should be EXECUTED (5)");
    });

    it("should not execute if majority not execute", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);
      await daoVault.connect(USER2).depositERC20(erc20.address, 1000);

      await daoVoting.connect(USER1).voteFor(0);
      await daoVoting.connect(USER2).voteAgainst(0);

      let proposal = await daoVoting.getProposal(0);

      expect(proposal["counters"].votedFor).to.be.equal(1000);
      expect(proposal["counters"].votedAgainst).to.be.equal(1000);
      expect(proposal["counters"].vetoesCount).to.be.equal(0);

      proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      expect(await daoVoting.getProposalStatus(0)).to.be.equal(2, "should be REJECTED (2)");
    });
  });

  describe("Restricted voting process", () => {
    beforeEach("setup", async () => {
      await memberStorage.addMember(Expert1.address);
      await memberStorage.addMember(Expert2.address);
      await memberStorage.addMember(Expert3.address);

      await daoVoting.createDAOVotingSituation({
        votingSituationName: "restricted",
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: FIFTY_PERCENTAGE,
          requiredMajority: "950000000000000000000000000",
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 1,
          votingTarget: memberStorageResource,
          votingMinAmount: 100,
        },
      });
    });

    it("should vote only by experts for proposal if they exist", async () => {
      await daoVoting.createProposal("restricted", "test remark", encodeAddMemberFunc(USER1.address));

      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await expect(daoVoting.connect(USER1).voteFor(0)).to.be.revertedWith(
        "DAOVoting: Permission denied - only experts have access."
      );

      await daoVault.connect(Expert1).depositERC20(erc20.address, 1000);
      await daoVault.connect(Expert2).depositERC20(erc20.address, 1000);
      await daoVault.connect(Expert3).depositERC20(erc20.address, 1000);

      await daoVoting.connect(Expert1).voteFor(0);
      await daoVoting.connect(Expert2).voteFor(0);

      const proposal = await daoVoting.getProposal(0);
      expect(proposal["counters"].votedFor).to.be.equal(2, "should be 2");

      const proposalStatus = await daoVoting.getProposalStatus(0);
      expect(proposalStatus).to.be.equal(1, "should be PENDING (1)");

      await daoVoting.connect(Expert3).voteFor(0);

      await daoVoting.executeProposal(0);
    });

    it("should vote only by experts for proposal, but wait for a veto", async () => {
      await manager.addVetoGroup(memberStorage.address, "Veto Member Storage", memberStorage.address);

      await daoVoting.createProposal("restricted", "test remark", encodeAddMemberFunc(USER1.address));

      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);

      await expect(daoVoting.connect(USER1).voteFor(0), "DAOVoting: Permission denied - only experts have access.");

      await daoVault.connect(Expert1).depositERC20(erc20.address, 1000);
      await daoVault.connect(Expert2).depositERC20(erc20.address, 1000);

      await daoVoting.connect(Expert1).voteFor(0);
      await daoVoting.connect(Expert2).voteFor(0);

      const proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].vetoEndTime) + 10);

      expect(proposal["counters"].votedFor).to.be.equal(2, "should be 2");

      await daoVoting.executeProposal(0);
    });
  });

  describe("Partially restricted voting process", () => {
    beforeEach("setup", async () => {
      await memberStorage.addMember(Expert1.address);
      await memberStorage.addMember(Expert2.address);
      await memberStorage.addMember(Expert3.address);

      await daoVoting.createDAOVotingSituation({
        votingSituationName: "partially restricted",
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: TEN_PERCENTAGE,
          requiredMajority: TEN_PERCENTAGE,
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 2,
          votingTarget: memberStorageResource,
          votingMinAmount: 100,
        },
      });
    });

    it("should create proposal only by experts and vote by anyone", async () => {
      await daoVault.connect(USER1).depositERC20(erc20.address, 1000);
      await daoVault.connect(Expert1).depositERC20(erc20.address, 1000);
      await daoVault.connect(Expert2).depositERC20(erc20.address, 1000);

      await expect(
        daoVoting
          .connect(USER1)
          .createProposal("partially restricted", "test remark", encodeAddMemberFunc(USER1.address))
      ).to.be.revertedWith("DAOVoting: Permission denied - only experts have access.");

      await daoVoting
        .connect(Expert1)
        .createProposal("partially restricted", "test remark", encodeAddMemberFunc(USER1.address));

      await daoVoting.connect(USER1).voteFor(0);
      await daoVoting.connect(Expert1).voteFor(0);

      const proposal = await daoVoting.getProposal(0);
      expect(proposal["counters"].votedFor).to.be.equal(2000, "should be 2");

      await setTime(Number(proposal["params"].votingEndTime) + 10);

      await daoVoting.executeProposal(0);
    });
  });

  describe("NFT voting process", () => {
    beforeEach("setup", async () => {
      await daoVoting.changeVotingToken(erc721.address);

      defaultVotingSituation = "general-nft";
      await daoVoting.createDAOVotingSituation({
        votingSituationName: `${defaultVotingSituation}`,
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: TEN_PERCENTAGE,
          requiredMajority: TEN_PERCENTAGE,
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 0,
          votingTarget: memberStorageResource,
          votingMinAmount: 1,
        },
      });
    });

    it("should create proposal with NFT", async () => {
      expect(await daoVoting.getVotingToken()).to.be.equal(erc721.address);

      await daoVault.connect(USER1).depositNFT(erc721.address, 0);
      await daoVault.connect(USER2).depositNFT(erc721.address, 1);

      await daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1.address));

      let proposal = await daoVoting.getProposal(0);
      expect(proposal["params"].votingType).to.be.equal(0);

      await daoVoting.connect(USER1).voteFor(0);
      await daoVoting.connect(USER2).voteFor(0);

      proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      expect((await daoVoting.getProposalStatus(0)).toString()).to.be.equal("4", "should be PASSED (4)");

      await daoVoting.executeProposal(0);

      expect((await daoVoting.getProposalStatus(0)).toString()).to.be.equal("5", "should be EXECUTED (5)");

      expect(await memberStorage.isMember(USER1.address)).to.be.equal(true);
    });
  });

  describe("SBT voting process", () => {
    beforeEach("setup", async () => {
      await daoVoting.changeVotingToken(sbt.address);

      defaultVotingSituation = "general-sbt";
      await daoVoting.createDAOVotingSituation({
        votingSituationName: `${defaultVotingSituation}`,
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: TEN_PERCENTAGE,
          requiredMajority: TEN_PERCENTAGE,
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 0,
          votingTarget: memberStorageResource,
          votingMinAmount: 1,
        },
      });
    });

    it("should create proposal with SBT", async () => {
      expect(await daoVoting.getVotingToken()).to.be.equal(sbt.address);

      await daoVault.connect(USER1).authorizeBySBT(sbt.address);
      await daoVault.connect(USER2).authorizeBySBT(sbt.address);

      await daoVoting
        .connect(USER1)
        .createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1.address));

      let proposal = await daoVoting.getProposal(0);
      expect(proposal["params"].votingType).to.be.equal(0);

      await daoVoting.connect(USER1).voteFor(0);
      await daoVoting.connect(USER2).voteFor(0);

      proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      expect((await daoVoting.getProposalStatus(0)).toString()).to.be.equal("4", "should be PASSED (4)");

      await daoVoting.executeProposal(0);

      expect((await daoVoting.getProposalStatus(0)).toString()).to.be.equal("5", "should be EXECUTED (5)");

      expect(await memberStorage.isMember(USER1.address)).to.be.equal(true);
    });
  });
});
