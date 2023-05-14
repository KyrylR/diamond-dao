import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";
import { wei } from "@/scripts/utils/utils";

import {
  DAO_REGISTRY_NAME,
  DAO_VAULT_NAME,
  DAO_VAULT_RESOURCE,
  UPDATE_PERMISSION,
  MINT_PERMISSION,
  BURN_PERMISSION,
  SPEND_PERMISSION,
  RECEIVE_PERMISSION,
  MASTER_ROLE,
  DAO_MEMBER_STORAGE_NAME,
  DefaultVotingParams,
  DAO_PARAMETER_STORAGE_NAME,
  CREATE_VOTING_PERMISSION,
  VOTE_PERMISSION,
  VETO_PERMISSION,
  CREATE_PERMISSION,
  TEN_PERCENTAGE,
  FIFTY_PERCENTAGE,
  ONE_HUNDRED_PERCENTAGE,
  DefaultERC20Params,
  DefaultERC721Params,
  EXPERTS_VOTING_NAME,
  GENERAL_VOTING_NAME,
  getDAOPanelResource,
  DAO_CONF_PARAMETER_STORAGE_NAME,
  DAO_REG_PARAMETER_STORAGE_NAME,
  ERC20_NAME, ERC721_NAME, SBT_NAME
} from "../utils/constants";

import { toBN, getBalance, setBalance } from "@/scripts/utils/utils";
import { getCurrentBlockTime, setTime } from "@/test/helpers/block-helper";
import { impersonate } from "@/test/helpers/impersonator";
import { castBN } from "@/test/utils/caster";

import { SBT, ERC20, ERC721, DAOVault, DAOMemberStorage, DAOVoting, PermissionManager, DAOParameterStorage } from "@ethers-v5";


describe("DAOVoting", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let Expert1: SignerWithAddress;
  let Expert2: SignerWithAddress;
  let Expert3: SignerWithAddress;

  let sbt: SBT;
  let erc20: ERC20;
  let erc721: ERC721;
  let manager: PermissionManager;
  let daoVault: DAOVault;
  let memberStorage: DAOMemberStorage;

  let daoVoting: DAOVoting;

  let parameterStorage;
  let confParameterStorage;
  let regParameterStorage;

  const TokenRoles = "TKR";
  const ExpertsDAOVotingRole = "VR";
  const DAOMemberStorageCreateRole = "SCR";
  const ExpertsDAOVotingCreateRole = "SDR";
  const DAOVaultRole = "VLR";

  let defaultVotingSituation: any;

  const SBT_RESOURCE = "SBT_RESOURCE";
  const ERC20_RESOURCE = "ERC20_RESOURCE";
  const ERC721_RESOURCE = "ERC721_RESOURCE";
  const DAO_VOTING_RESOURCE = "DAO_VOTING_RESOURCE";
  const GENERAL_DAO_VOTING_NAME = "GENERAL_DAO_VOTING";
  const EXPERTS_DAO_VOTING_NAME = "EXPERTS_DAO_VOTING_NAME";

  before("setup", async () => {
    [OWNER, USER1, USER2, Expert1, Expert2, Expert3] = await ethers.getSigners();

    sbt = await SBT.new();
    erc20 = await ERC20.new();
    erc721 = await ERC721.new();
    daoVault = await DAOVault.new();
    registry = await DAORegistry.new();
    memberStorage = await DAOMemberStorage.new();
    daoVoting = await ExpertsDAOVoting.new();
    generalDaoVoting = await GeneralDAOVoting.new();
    parameterStorage = await DAOParameterStorage.new();

    await registry.__DAORegistry_init(
      (
        await PermissionManager.new()
      ).address,
      OWNER,
      DAO_REGISTRY_NAME,
      "DAO_REGISTRY",
      "daoURI"
    );

    manager = await PermissionManager.at(await registry.getPermissionManager());

    const daoMemberStorageResource = getDAOPanelResource(DAO_MEMBER_STORAGE_NAME, DefaultVotingParams.panelName);
    const daoParameterStorageResource = getDAOPanelResource(DAO_PARAMETER_STORAGE_NAME, DefaultVotingParams.panelName);
    const daoConfParameterStorageResource = getDAOPanelResource(
      DAO_CONF_PARAMETER_STORAGE_NAME,
      DefaultVotingParams.panelName
    );
    const daoRegParameterStorageResource = getDAOPanelResource(
      DAO_REG_PARAMETER_STORAGE_NAME,
      DefaultVotingParams.panelName
    );

    await registry.addProxyContract(DAO_VAULT_NAME, daoVault.address);
    await registry.addProxyContract(SBT_NAME, sbt.address);
    await registry.addProxyContract(ERC20_NAME, erc20.address);
    await registry.addProxyContract(ERC721_NAME, erc721.address);
    await registry.addProxyContract(daoMemberStorageResource, memberStorage.address);
    await registry.addProxyContract(daoParameterStorageResource, parameterStorage.address);
    await registry.addProxyContract(daoConfParameterStorageResource, parameterStorage.address);
    await registry.addProxyContract(daoRegParameterStorageResource, parameterStorage.address);
    await registry.addProxyContract(EXPERTS_DAO_VOTING_NAME, daoVoting.address);
    await registry.addProxyContract(GENERAL_DAO_VOTING_NAME, generalDaoVoting.address);

    daoVault = await DAOVault.at(await registry.getDAOVault());
    sbt = await SBT.at(await registry.getContract(SBT_NAME));
    erc20 = await ERC20.at(await registry.getContract(ERC20_NAME));
    erc721 = await ERC721.at(await registry.getContract(ERC721_NAME));
    memberStorage = await DAOMemberStorage.at(await registry.getContract(daoMemberStorageResource));
    parameterStorage = await DAOParameterStorage.at(await registry.getContract(daoParameterStorageResource));
    confParameterStorage = await DAOParameterStorage.at(await registry.getContract(daoConfParameterStorageResource));
    regParameterStorage = await DAOParameterStorage.at(await registry.getContract(daoRegParameterStorageResource));
    daoVoting = await ExpertsDAOVoting.at(await registry.getContract(EXPERTS_DAO_VOTING_NAME));
    generalDaoVoting = await GeneralDAOVoting.at(await registry.getContract(GENERAL_DAO_VOTING_NAME));

    await sbt.__SBT_init(DefaultERC721Params, SBT_RESOURCE);
    await erc20.__ERC20_init(DefaultERC20Params, ERC20_RESOURCE);
    await erc721.__ERC721_init(DefaultERC721Params, ERC721_RESOURCE);
    await daoVault.__DAOVault_init(registry.address);
    await memberStorage.__DAOMemberStorage_init(DefaultVotingParams.panelName, daoMemberStorageResource);
    await parameterStorage.__DAOParameterStorage_init(daoParameterStorageResource);
    await confParameterStorage.__DAOParameterStorage_init(daoConfParameterStorageResource);
    await regParameterStorage.__DAOParameterStorage_init(daoRegParameterStorageResource);

    DefaultVotingParams.votingToken = erc20.address;
    await daoVoting.__DAOVoting_init(DefaultVotingParams, `EXPERTS_VOTING:${DefaultVotingParams.panelName}`);
    await generalDaoVoting.__DAOVoting_init(DefaultVotingParams, `GENERAL_VOTING:${DefaultVotingParams.panelName}`);

    await registry.injectDependencies(EXPERTS_DAO_VOTING_NAME);
    await registry.injectDependencies(GENERAL_DAO_VOTING_NAME);
    await registry.injectDependencies(daoMemberStorageResource);
    await registry.injectDependencies(daoParameterStorageResource);
    await registry.injectDependencies(daoConfParameterStorageResource);
    await registry.injectDependencies(daoRegParameterStorageResource);
    await registry.injectDependencies(DAO_VAULT_NAME);

    await manager.initialConfiguration(
      registry.address,
      daoVoting.address,
      EXPERTS_VOTING_NAME,
      DefaultVotingParams.panelName
    );

    await manager.initialConfiguration(
      registry.address,
      generalDaoVoting.address,
      GENERAL_VOTING_NAME,
      DefaultVotingParams.panelName
    );

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
        votingTarget: `${daoMemberStorageResource}`,
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
        votingTarget: `${EXPERTS_DAO_VOTING_NAME}`,
        votingMinAmount: 100,
      },
    });

    const ExpertsDAOVotingPermissions = [
      `EXPERTS_VOTING:${DefaultVotingParams.panelName}`,
      [CREATE_VOTING_PERMISSION, VOTE_PERMISSION, VETO_PERMISSION],
    ];
    const TokenPermissions = [ERC20_RESOURCE, [MINT_PERMISSION, BURN_PERMISSION, SPEND_PERMISSION, RECEIVE_PERMISSION]];
    const DAOMemberStorageCreate = [daoMemberStorageResource, [CREATE_PERMISSION]];
    const ExpertsDAOVotingCreate = [`EXPERTS_VOTING:${DefaultVotingParams.panelName}`, [CREATE_PERMISSION]];
    const DAOVaultPermissions = [DAO_VAULT_RESOURCE, [UPDATE_PERMISSION]];

    await manager.addPermissionsToRole(ExpertsDAOVotingCreateRole, [ExpertsDAOVotingCreate], true);
    await manager.addPermissionsToRole(DAOMemberStorageCreateRole, [DAOMemberStorageCreate], true);
    await manager.addPermissionsToRole(ExpertsDAOVotingRole, [ExpertsDAOVotingPermissions], true);
    await manager.addPermissionsToRole(TokenRoles, [TokenPermissions], true);
    await manager.addPermissionsToRole(DAOVaultRole, [DAOVaultPermissions], true);

    await manager.grantRoles(USER1, [TokenRoles]);

    await erc20.mintTo(USER1, "1000", { from: OWNER });
    await erc20.mintTo(USER2, "1000", { from: OWNER });
    await erc20.mintTo(Expert1, "1000", { from: OWNER });
    await erc20.mintTo(Expert2, "1000", { from: OWNER });
    await erc20.mintTo(Expert3, "1000", { from: OWNER });
    await erc20.mintTo(OWNER, "100", { from: OWNER });
    await erc20.approve(daoVault.address, "1000", { from: USER1 });
    await erc20.approve(daoVault.address, "1000", { from: USER2 });
    await erc20.approve(daoVault.address, "1000", { from: Expert1 });
    await erc20.approve(daoVault.address, "1000", { from: Expert2 });
    await erc20.approve(daoVault.address, "1000", { from: Expert3 });
    await erc20.approve(daoVault.address, "1000", { from: OWNER });

    await erc721.mintTo(USER1, 0, "some_uri", { from: OWNER });
    await erc721.mintTo(USER2, 1, "some_uri", { from: OWNER });
    await erc721.mintTo(OWNER, 2, "some_uri", { from: OWNER });
    await erc721.setApprovalForAll(daoVault.address, true, { from: USER1 });
    await erc721.setApprovalForAll(daoVault.address, true, { from: USER2 });
    await erc721.setApprovalForAll(daoVault.address, true, { from: OWNER });

    await manager.grantRoles(daoVault.address, [MASTER_ROLE]);
    await manager.grantRoles(memberStorage.address, [MASTER_ROLE]);

    await daoVault.depositERC20(erc20.address, 100, { from: OWNER });
    await daoVault.depositNFT(erc721.address, 2, { from: OWNER });

    await sbt.mintTo(USER1, 0, "some_uri", 0, { from: OWNER });
    await sbt.mintTo(USER2, 1, "some_uri", 0, { from: OWNER });

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  function encodeAddMemberFunc(member) {
    return web3.eth.abi.encodeFunctionCall(
      {
        name: "addMember",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "member_",
          },
        ],
      },
      [member]
    );
  }

  describe("access", () => {
    it("only injector should set dependencies", async () => {
      await truffleAssert.reverts(
        daoVoting.setDependencies(registry.address, "0x", { from: USER1 }),
        "Dependant: not an injector"
      );

      await truffleAssert.reverts(
        generalDaoVoting.setDependencies(registry.address, "0x", { from: USER1 }),
        "Dependant: not an injector"
      );
    });

    it("should initialize only once", async () => {
      await truffleAssert.reverts(
        daoVoting.__DAOVoting_init(DefaultVotingParams, DAO_VOTING_RESOURCE),
        "Initializable: contract is already initialized"
      );
    });
  });

  describe("createDAOVotingSituation", () => {
    it("should initialize voting", async () => {
      await truffleAssert.reverts(
        daoVoting.createDAOVotingSituation(
          {
            votingSituationName: "general",
            votingValues: {
              votingPeriod: 60,
              vetoPeriod: 60,
              proposalExecutionPeriod: 60,
              requiredQuorum: TEN_PERCENTAGE,
              requiredMajority: TEN_PERCENTAGE,
              requiredVetoQuorum: FIFTY_PERCENTAGE,
              votingType: 0,
              votingTarget: `${GENERAL_VOTING_NAME}:${DefaultVotingParams.panelName}`,
              votingMinAmount: 100,
            },
          },
          { from: USER1 }
        ),
        "[QGDK-018014]-The sender is not allowed to perform the action, access denied."
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
          votingType: 0,
          votingTarget: `${GENERAL_VOTING_NAME}:${DefaultVotingParams.panelName}`,
          votingMinAmount: 100,
        },
      });
    });
  });

  describe("removeVotingSituation", () => {
    it("should remove voting situation", async () => {
      await truffleAssert.reverts(
        daoVoting.removeVotingSituation("new-one"),
        "[QGDK-018001]-The voting situation does not exist."
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
          votingTarget: `${GENERAL_VOTING_NAME}:${DefaultVotingParams.panelName}`,
          votingMinAmount: 99,
        },
      });

      await truffleAssert.reverts(
        daoVoting.removeVotingSituation("new-one", { from: USER1 }),
        "[QGDK-018014]-The sender is not allowed to perform the action, access denied."
      );

      await truffleAssert.reverts(
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
            votingTarget: `${GENERAL_VOTING_NAME}:${DefaultVotingParams.panelName}`,
            votingMinAmount: 100,
          },
        }),
        "[QGDK-018000]-The voting situation already exists."
      );

      assert.deepEqual(await daoVoting.getVotingSituations(), [
        "Membership voting",
        "General voting",
        "new-one",
      ]);

      const situationInfo = await daoVoting.getVotingSituationInfo("new-one");
      assert.equal(situationInfo.votingPeriod, 60);
      assert.equal(situationInfo.vetoPeriod, 60);
      assert.equal(situationInfo.proposalExecutionPeriod, 60);
      assert.equal(situationInfo.requiredQuorum, TEN_PERCENTAGE);
      assert.equal(situationInfo.requiredMajority, TEN_PERCENTAGE);
      assert.equal(situationInfo.requiredVetoQuorum, FIFTY_PERCENTAGE);
      assert.equal(situationInfo.votingType, 2);
      assert.equal(situationInfo.votingTarget, `${GENERAL_VOTING_NAME}:${DefaultVotingParams.panelName}`);
      assert.equal(situationInfo.votingMinAmount, 99);

      await daoVoting.removeVotingSituation("new-one");

      assert.deepEqual(await daoVoting.getVotingSituations(), ["Membership voting", "General voting"]);
    });
  });

  describe("createProposal", () => {
    it("should create proposal", async () => {
      await truffleAssert.reverts(
        daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1), {
          from: USER1,
        }),
        "[QGDK-018014]-The sender is not allowed to perform the action, access denied."
      );

      await manager.grantRoles(USER1, [ExpertsDAOVotingRole]);

      await truffleAssert.reverts(
        daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1), {
          from: USER1,
        }),
        "[QGDK-018015]-The sender is not allowed to perform the action on the target, access denied."
      );

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "0", "should be NONE (0)");

      await truffleAssert.reverts(
        daoVoting.createProposal("nothing", "test remark", encodeAddMemberFunc(USER1), {
          from: USER1,
        }),
        "[QGDK-018002]-The voting situation does not exist, impossible to create a proposal."
      );

      await daoVault.depositERC20(erc20.address, 1, { from: USER1 });

      await truffleAssert.reverts(
        daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1), {
          from: USER1,
        }),
        "[QGDK-018004]-The user voting power is too low to create a proposal."
      );

      await daoVault.depositERC20(erc20.address, 999, { from: USER1 });

      await truffleAssert.passes(
        daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1), {
          from: USER1,
        }),
        "passes"
      );

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "1", "should be PENDING (1)");

      const proposal = await daoVoting.getProposal(0);
      assert.equal(proposal.remark, "test remark");
      assert.equal(proposal.callData, encodeAddMemberFunc(USER1));
      assert.equal(proposal.target, memberStorage.address);
      assert.equal(proposal.executed, false, "should not be executed");
      assert.equal(proposal["counters"].votedFor, 0);
      assert.equal(proposal["counters"].votedAgainst, 0);
      assert.equal(proposal["counters"].vetoesCount, 0);
      assert.equal(proposal["params"].votingStartTime, 0);
      assert.equal(proposal["params"].votingEndTime, proposal["params"].vetoEndTime);
      assert.equal(proposal["params"].requiredQuorum, TEN_PERCENTAGE);
    });
  });

  describe("voting process", () => {
    beforeEach("setup", async () => {
      await daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1), {
        from: OWNER,
      });
    });

    it("should vote for", async () => {
      await truffleAssert.reverts(
        daoVoting.voteFor(0, { from: USER1 }),
        "[QGDK-018014]-The sender is not allowed to perform the action, access denied."
      );

      await manager.addUserToGroups(USER1, ["DAOGroup:DAO_REGISTRY"]);

      await truffleAssert.reverts(
        daoVoting.voteFor(1, { from: USER1 }),
        "[QGDK-018013]-The proposal does not exist."
      );

      await truffleAssert.reverts(
        daoVoting.voteFor(0, { from: USER1 }),
        "[QGDK-018011]-The user has no voting power."
      );

      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: USER1 }), "passes");

      const proposal = await daoVoting.getProposal(0);
      assert.equal(proposal["counters"].votedFor, 1000);
      assert.equal(proposal["counters"].votedAgainst, 0);
      assert.equal(proposal["counters"].vetoesCount, 0);

      await truffleAssert.reverts(
        daoVoting.voteFor(0, { from: USER1 }),
        "[QGDK-018010]-The user has already voted."
      );
    });

    it("should vote against", async () => {
      await truffleAssert.reverts(
        daoVoting.voteAgainst(0, { from: USER1 }),
        "[QGDK-018014]-The sender is not allowed to perform the action, access denied."
      );

      await daoVault.depositERC20(erc20.address, 700, { from: USER1 });

      await truffleAssert.passes(daoVoting.voteAgainst(0, { from: USER1 }), "passes");

      const proposal = await daoVoting.getProposal(0);
      assert.equal(proposal["counters"].votedFor, 0);
      assert.equal(proposal["counters"].votedAgainst, 700);
      assert.equal(proposal["counters"].vetoesCount, 0);

      await setTime(Number(proposal["params"].votingEndTime) + 10);

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "2", "should be REJECTED (2)");
    });

    it("should execute proposal in the end", async () => {
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: USER1 }), "passes");

      await truffleAssert.reverts(
        daoVoting.executeProposal(0, { from: USER1 }),
        "[QGDK-018007]-The proposal must be passed to be executed."
      );

      let proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "4", "should be PASSED (4)");

      await truffleAssert.reverts(
        daoVoting.voteFor(0, { from: USER1 }),
        "[QGDK-018009]-The proposal must be pending to be voted."
      );

      await truffleAssert.passes(daoVoting.executeProposal(0), "passes");

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "5", "should be EXECUTED (5)");
    });

    it("should not execute proposal if quorum is not reached", async () => {
      await daoVault.depositERC20(erc20.address, 100, { from: USER1 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: USER1 }), "passes");

      let proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "2", "should be REJECTED (2)");
    });

    it("should be expired proposal if it wasn't executed", async () => {
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: USER1 }), "passes");

      const proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "4", "should be PASSED (4)");

      await setTime(Number(proposal["params"].votingEndTime) + 100);

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "6", "should be EXPIRED (6)");
    });

    it("should not execute proposal with invalid data", async () => {
      await daoVoting.createProposal(defaultVotingSituation, "test remark", "0x0", {
        from: OWNER,
      });

      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.passes(daoVoting.voteFor(1, { from: USER1 }), "passes");

      const proposal = await daoVoting.getProposal(1);
      await setTime(Number(proposal["params"].vetoEndTime) + 10);

      assert.equal((await daoVoting.getProposalStatus(1)).toString(), "4", "should be PASSED (4)");

      await truffleAssert.reverts(daoVoting.executeProposal(1), "[QGDK-018008]-The proposal execution failed.");

      let list = await daoVoting.getProposalList(0, 1);
      assert.equal(list.length, 1);
      assert.equal(list[0].id, 1);

      list = await daoVoting.getProposalList(0, 2);
      assert.equal(list.length, 2);
      assert.equal(list[0].id, 1);
      assert.equal(list[1].id, 0);

      list = await daoVoting.getProposalList(1, 20);
      assert.equal(list.length, 1);
      assert.equal(list[0].id, 0);

      list = await daoVoting.getProposalList(300, 20);
      assert.equal(list.length, 0);
    });
  });

  describe("veto process", () => {
    beforeEach("setup", async () => {
      await manager.addVetoGroup(memberStorage.address, "Veto Member Storage", memberStorage.address, {
        from: OWNER,
      });

      await memberStorage.addMember(Expert1, { from: OWNER });
      await memberStorage.addMember(Expert2, { from: OWNER });
      await memberStorage.addMember(Expert3, { from: OWNER });

      await daoVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1), {
        from: OWNER,
      });
    });

    it("should veto proposal", async () => {
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: USER1 }), "passes");

      await truffleAssert.reverts(
        daoVoting.veto(0, { from: Expert1 }),
        "[QGDK-018006]-The proposal must be accepted to be vetoed."
      );

      const proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);
      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "3", "should be ACCEPTED (3)");

      await truffleAssert.reverts(
        daoVoting.veto(0, { from: USER1 }),
        "[QGDK-018015]-The sender is not allowed to perform the action on the target, access denied."
      );

      await truffleAssert.passes(daoVoting.veto(0, { from: Expert1 }), "passes");

      const proposalStats = await daoVoting.getProposalVotingStats(0);
      assert.equal(proposalStats.requiredQuorum, TEN_PERCENTAGE);

      const overallVotingPower = await daoVault.getTokenSupply(await daoVoting.votingToken());
      const expectedQuorum = (proposal["counters"].votedFor + proposal["counters"].votedAgainst) / overallVotingPower;

      assert.approximately(Number(proposalStats.currentQuorum), expectedQuorum * 10 ** 26, 10 ** 12);
      assert.equal(proposalStats.requiredMajority, FIFTY_PERCENTAGE);
      assert.equal(proposalStats.currentMajority, ONE_HUNDRED_PERCENTAGE);
      assert.equal(proposalStats.currentVetoQuorum, "3".repeat(27));
      assert.equal(proposalStats.requiredVetoQuorum, FIFTY_PERCENTAGE);

      await truffleAssert.reverts(
        daoVoting.veto(0, { from: Expert1 }),
        "[QGDK-018005]-The eligible user has already vetoed."
      );

      await truffleAssert.passes(daoVoting.veto(0, { from: Expert2 }), "passes");

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "2", "should be REJECTED (2)");
    });
  });

  describe("checkPermission", () => {
    it("should check permission", async () => {
      assert.equal(await daoVoting.getResource(), await daoVoting.DAO_VOTING_RESOURCE());

      assert.isFalse(await daoVoting.checkPermission(USER1, CREATE_PERMISSION));

      await manager.grantRoles(USER1, [ExpertsDAOVotingCreateRole]);

      assert.isTrue(await daoVoting.checkPermission(USER1, CREATE_PERMISSION));
    });
  });

  describe("General voting", () => {
    beforeEach("setup", async () => {
      await daoVoting.createProposal("General voting", "test remark", "0x", {
        from: OWNER,
      });
    });

    it("should vote for/against and execute", async () => {
      await truffleAssert.reverts(
        daoVoting.createProposal("Membership voting", "test remark", "0x", {
          from: OWNER,
        }),
        "[QGDK-018003]-The general voting must be called on the Voting contract."
      );

      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: USER1 }), "passes");

      let proposal = await daoVoting.getProposal(0);
      assert.equal(proposal["counters"].votedFor, 1000);
      assert.equal(proposal["counters"].votedAgainst, 0);
      assert.equal(proposal["counters"].vetoesCount, 0);

      await truffleAssert.reverts(
        daoVoting.voteFor(0, { from: USER1 }),
        "[QGDK-018010]-The user has already voted."
      );

      proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "4", "should be PASSED (4)");

      await truffleAssert.passes(daoVoting.executeProposal(0), "passes");

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "5", "should be EXECUTED (5)");
    });

    it("should not execute if majority not execute", async () => {
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });
      await daoVault.depositERC20(erc20.address, 1000, { from: USER2 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: USER1 }), "passes");
      await truffleAssert.passes(daoVoting.voteAgainst(0, { from: USER2 }), "passes");

      let proposal = await daoVoting.getProposal(0);
      assert.equal(proposal["counters"].votedFor, 1000);
      assert.equal(proposal["counters"].votedAgainst, 1000);
      assert.equal(proposal["counters"].vetoesCount, 0);

      proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      assert.equal((await daoVoting.getProposalStatus(0)).toString(), "2", "should be REJECTED (2)");
    });
  });

  describe("Restricted voting process", () => {
    beforeEach("setup", async () => {
      await memberStorage.addMember(Expert1, { from: OWNER });
      await memberStorage.addMember(Expert2, { from: OWNER });
      await memberStorage.addMember(Expert3, { from: OWNER });

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
          votingTarget: `${DAO_MEMBER_STORAGE_NAME}:${DefaultVotingParams.panelName}`,
          votingMinAmount: 100,
        },
      });
    });

    it("should vote only by experts for proposal if they exist", async () => {
      await daoVoting.createProposal("restricted", "test remark", encodeAddMemberFunc(USER1), {
        from: OWNER,
      });

      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.reverts(
        daoVoting.voteFor(0, { from: USER1 }),
        "[QGDK-017000]-Permission denied - only experts have access."
      );

      await daoVault.depositERC20(erc20.address, 1000, { from: Expert1 });
      await daoVault.depositERC20(erc20.address, 1000, { from: Expert2 });
      await daoVault.depositERC20(erc20.address, 1000, { from: Expert3 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: Expert1 }), "passes");
      await truffleAssert.passes(daoVoting.voteFor(0, { from: Expert2 }), "passes");

      const proposal = await daoVoting.getProposal(0);
      assert.equal(proposal["counters"].votedFor, "2", "should be 2");

      const proposalStatus = await daoVoting.getProposalStatus(0);
      assert.equal(proposalStatus.toString(), "1", "should be PENDING (1)");

      await truffleAssert.passes(daoVoting.voteFor(0, { from: Expert3 }), "passes");

      await truffleAssert.passes(daoVoting.executeProposal(0), "passes");
    });

    it("should vote only by experts for proposal, but wait for a veto", async () => {
      await manager.addVetoGroup(memberStorage.address, "Veto Member Storage", memberStorage.address, {
        from: OWNER,
      });

      await daoVoting.createProposal("restricted", "test remark", encodeAddMemberFunc(USER1), {
        from: OWNER,
      });

      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });

      await truffleAssert.reverts(
        daoVoting.voteFor(0, { from: USER1 }),
        "[QGDK-017000]-Permission denied - only experts have access."
      );

      await daoVault.depositERC20(erc20.address, 1000, { from: Expert1 });
      await daoVault.depositERC20(erc20.address, 1000, { from: Expert2 });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: Expert1 }), "passes");
      await truffleAssert.passes(daoVoting.voteFor(0, { from: Expert2 }), "passes");

      const proposal = await daoVoting.getProposal(0);
      await setTime(Number(proposal["params"].vetoEndTime) + 10);

      assert.equal(proposal["counters"].votedFor, "2", "should be 2");

      await truffleAssert.passes(daoVoting.executeProposal(0), "passes");
    });
  });

  describe("Partially restricted voting process", () => {
    beforeEach("setup", async () => {
      await memberStorage.addMember(Expert1, { from: OWNER });
      await memberStorage.addMember(Expert2, { from: OWNER });
      await memberStorage.addMember(Expert3, { from: OWNER });

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
          votingTarget: `${DAO_MEMBER_STORAGE_NAME}:${DefaultVotingParams.panelName}`,
          votingMinAmount: 100,
        },
      });
    });

    it("should create proposal only by experts and vote by anyone", async () => {
      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });
      await daoVault.depositERC20(erc20.address, 1000, { from: Expert1 });
      await daoVault.depositERC20(erc20.address, 1000, { from: Expert2 });

      await truffleAssert.reverts(
        daoVoting.createProposal("partially restricted", "test remark", encodeAddMemberFunc(USER1), {
          from: USER1,
        }),
        "[QGDK-017000]-Permission denied - only experts have access."
      );

      await daoVoting.createProposal("partially restricted", "test remark", encodeAddMemberFunc(USER1), {
        from: Expert1,
      });

      await truffleAssert.passes(daoVoting.voteFor(0, { from: USER1 }), "passes");
      await truffleAssert.passes(daoVoting.voteFor(0, { from: Expert1 }), "passes");

      const proposal = await daoVoting.getProposal(0);
      assert.equal(proposal["counters"].votedFor, "2000", "should be 2");

      await setTime(Number(proposal["params"].votingEndTime) + 10);

      await truffleAssert.passes(daoVoting.executeProposal(0), "passes");
    });
  });

  describe("General voting process", () => {
    it("should create proposal only by experts and vote by anyone", async () => {
      await generalDaoVoting.createDAOVotingSituation({
        votingSituationName: "general voting",
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: TEN_PERCENTAGE,
          requiredMajority: TEN_PERCENTAGE,
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 1,
          votingTarget: `${DAO_MEMBER_STORAGE_NAME}:${DefaultVotingParams.panelName}`,
          votingMinAmount: 100,
        },
      });

      await daoVault.depositERC20(erc20.address, 1000, { from: USER1 });
      await daoVault.depositERC20(erc20.address, 1000, { from: Expert1 });
      await daoVault.depositERC20(erc20.address, 1000, { from: Expert2 });

      await truffleAssert.reverts(
        generalDaoVoting.createProposal("general voting", "test remark", encodeAddMemberFunc(USER1), {
          from: Expert1,
        }),
        "[QGDK-018012]-The restricted voting is not supported."
      );
    });
  });

  describe("NFT voting process", () => {
    let NFTVoting;

    beforeEach("setup", async () => {
      NFTVoting = await ExpertsDAOVoting.new();

      await registry.addProxyContract("NFTVoting", NFTVoting.address);

      NFTVoting = await ExpertsDAOVoting.at(await registry.getContract("NFTVoting"));

      DefaultVotingParams.votingToken = erc721.address;
      await NFTVoting.__DAOVoting_init(DefaultVotingParams, `EXPERTS_VOTING:${DefaultVotingParams.panelName}`);

      await registry.injectDependencies("NFTVoting");

      await manager.initialConfiguration(
        registry.address,
        NFTVoting.address,
        EXPERTS_VOTING_NAME,
        DefaultVotingParams.panelName
      );

      defaultVotingSituation = "general";
      await NFTVoting.createDAOVotingSituation({
        votingSituationName: `${defaultVotingSituation}`,
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: TEN_PERCENTAGE,
          requiredMajority: TEN_PERCENTAGE,
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 0,
          votingTarget: `${DAO_MEMBER_STORAGE_NAME}:${DefaultVotingParams.panelName}`,
          votingMinAmount: 1,
        },
      });
    });

    it("should create proposal with NFT", async () => {
      assert.equal(await NFTVoting.votingToken(), erc721.address);

      await daoVault.depositNFT(erc721.address, 0, { from: USER1 });
      await daoVault.depositNFT(erc721.address, 1, { from: USER2 });

      await truffleAssert.passes(
        NFTVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1), {
          from: OWNER,
        }),
        "passes"
      );

      let proposal = await NFTVoting.getProposal(0);
      assert.equal(proposal["params"].votingType, "0");

      await truffleAssert.passes(NFTVoting.voteFor(0, { from: USER1 }), "passes");
      await truffleAssert.passes(NFTVoting.voteFor(0, { from: USER2 }), "passes");

      proposal = await NFTVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      assert.equal((await NFTVoting.getProposalStatus(0)).toString(), "4", "should be PASSED (4)");

      await truffleAssert.passes(NFTVoting.executeProposal(0), "passes");

      assert.equal((await NFTVoting.getProposalStatus(0)).toString(), "5", "should be EXECUTED (5)");

      assert.equal(await memberStorage.isMember(USER1), true);
    });
  });

  describe("SBT voting process", () => {
    let SBTVoting;

    beforeEach("setup", async () => {
      SBTVoting = await ExpertsDAOVoting.new();

      await registry.addProxyContract("SBTVoting", SBTVoting.address);

      SBTVoting = await ExpertsDAOVoting.at(await registry.getContract("SBTVoting"));

      DefaultVotingParams.votingToken = sbt.address;
      await SBTVoting.__DAOVoting_init(DefaultVotingParams, `EXPERTS_VOTING:${DefaultVotingParams.panelName}`);

      await registry.injectDependencies("SBTVoting");

      await manager.initialConfiguration(
        registry.address,
        SBTVoting.address,
        EXPERTS_VOTING_NAME,
        DefaultVotingParams.panelName
      );

      defaultVotingSituation = "general";
      await SBTVoting.createDAOVotingSituation({
        votingSituationName: `${defaultVotingSituation}`,
        votingValues: {
          votingPeriod: 60,
          vetoPeriod: 60,
          proposalExecutionPeriod: 60,
          requiredQuorum: TEN_PERCENTAGE,
          requiredMajority: TEN_PERCENTAGE,
          requiredVetoQuorum: FIFTY_PERCENTAGE,
          votingType: 0,
          votingTarget: `${DAO_MEMBER_STORAGE_NAME}:${DefaultVotingParams.panelName}`,
          votingMinAmount: 1,
        },
      });
    });

    it("should create proposal with SBT", async () => {
      assert.equal(await SBTVoting.votingToken(), sbt.address);

      await daoVault.authorizeBySBT(sbt.address, { from: USER1 });
      await daoVault.authorizeBySBT(sbt.address, { from: USER2 });

      await truffleAssert.passes(
        SBTVoting.createProposal(defaultVotingSituation, "test remark", encodeAddMemberFunc(USER1), {
          from: USER1,
        }),
        "passes"
      );

      let proposal = await SBTVoting.getProposal(0);
      assert.equal(proposal["params"].votingType, "0");

      await truffleAssert.passes(SBTVoting.voteFor(0, { from: USER1 }), "passes");
      await truffleAssert.passes(SBTVoting.voteFor(0, { from: USER2 }), "passes");

      proposal = await SBTVoting.getProposal(0);
      await setTime(Number(proposal["params"].votingEndTime) + 10);

      assert.equal((await SBTVoting.getProposalStatus(0)).toString(), "4", "should be PASSED (4)");

      await truffleAssert.passes(SBTVoting.executeProposal(0), "passes");

      assert.equal((await SBTVoting.getProposalStatus(0)).toString(), "5", "should be EXECUTED (5)");

      assert.equal(await memberStorage.isMember(USER1), true);
    });
  });
});
