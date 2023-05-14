// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import "@dlsl/dev-modules/utils/Globals.sol";
import "@dlsl/dev-modules/libs/data-structures/StringSet.sol";

import "./Globals.sol";
import "./DAOVault.sol";
import "./PermissionManager.sol";
import "./DAOParameterStorage.sol";

import "../storages/DAOVotingStorage.sol";

import "../libs/Parameters.sol";

/**
 * @title GeneralDAOVoting
 * @dev Implementation of contract that manages voting for a DAO.
 */
contract DAOVoting is DAOVotingStorage {
    using ParameterCodec for *;
    using ArrayHelper for *;

    using ERC165Checker for address;

    using StringHelper for string;
    using StringSet for StringSet.Set;

    /**
     * @notice Initializes the contract.
     */
    function __DAOVoting_init(
        string calldata panelName_,
        address votingToken_,
        string calldata resource_
    ) external {
        VotingStorage storage _vs = getDAOVotingStorage();

        require(!_vs.initialized, "DAOVoting: already initialized");

        _vs.DAO_VOTING_RESOURCE = resource_;

        _vs.votingToken = votingToken_;
        _vs.targetPanel = panelName_;

        _vs.permissionManager = PermissionManager(address(this));
        _vs.daoParameterStorage = DAOParameterStorage(address(this));
        _vs.daoMemberStorage = DAOMemberStorage(address(this));
        _vs.daoVault = DAOVault(payable(address(this)));

        _vs.initialized = true;
    }

    /**
     * @dev Initializes the DAO voting contract with the specified voting keys and values.
     */
    function createDAOVotingSituation(
        IDAOVoting.InitialSituation memory conf_
    ) external override onlyCreatePermission {
        string memory situation_ = conf_.votingSituationName;
        VotingStorage storage _vs = getDAOVotingStorage();

        require(
            _vs.votingSituations.add(situation_),
            "DAOVoting: The voting situation already exists."
        );

        DAOVotingValues memory votingValues_ = conf_.votingValues;

        _vs.daoParameterStorage.setDAOParameters(
            [
                votingValues_.votingPeriod.encodeUint256(getVotingKey(situation_, VOTING_PERIOD)),
                votingValues_.vetoPeriod.encodeUint256(getVotingKey(situation_, VETO_PERIOD)),
                votingValues_.proposalExecutionPeriod.encodeUint256(
                    getVotingKey(situation_, PROPOSAL_EXECUTION_PERIOD)
                ),
                votingValues_.requiredQuorum.encodeUint256(
                    getVotingKey(situation_, REQUIRED_QUORUM)
                ),
                votingValues_.requiredMajority.encodeUint256(
                    getVotingKey(situation_, REQUIRED_MAJORITY)
                ),
                votingValues_.requiredVetoQuorum.encodeUint256(
                    getVotingKey(situation_, REQUIRED_VETO_QUORUM)
                ),
                votingValues_.votingType.encodeUint256(getVotingKey(situation_, VOTING_TYPE)),
                votingValues_.votingTarget.encodeString(getVotingKey(situation_, VOTING_TARGET)),
                votingValues_.votingMinAmount.encodeUint256(
                    getVotingKey(situation_, VOTING_MIN_AMOUNT)
                )
            ].asArray()
        );
    }

    /**
     * @dev Removes a voting situation from the DAO.
     * @param situation_ The name of the voting situation to remove.
     */
    function removeVotingSituation(
        string memory situation_
    ) external override onlyDeletePermission {
        VotingStorage storage _vs = getDAOVotingStorage();

        _vs.votingSituations.remove(situation_);

        _vs.daoParameterStorage.removeDAOParameters(
            [
                getVotingKey(situation_, VOTING_PERIOD),
                getVotingKey(situation_, VETO_PERIOD),
                getVotingKey(situation_, PROPOSAL_EXECUTION_PERIOD),
                getVotingKey(situation_, REQUIRED_QUORUM),
                getVotingKey(situation_, REQUIRED_MAJORITY),
                getVotingKey(situation_, REQUIRED_VETO_QUORUM),
                getVotingKey(situation_, VOTING_TYPE),
                getVotingKey(situation_, VOTING_TARGET),
                getVotingKey(situation_, VOTING_MIN_AMOUNT)
            ].asArray()
        );
    }

    /**
     * @inheritdoc IDAOVoting
     *
     * @dev Minimally used variables here, because of stack too deep error.
     */
    function createProposal(
        string calldata situation_,
        string calldata remark_,
        bytes calldata callData_
    ) external onlyCreateVotingPermission returns (uint256) {
        VotingStorage storage _vs = getDAOVotingStorage();

        require(
            _vs.votingSituations.contains(situation_),
            "DAOVoting: The voting situation does not exist, impossible to create a proposal."
        );

        uint256 proposalId_ = _vs.proposalCount++;

        DAOProposal storage newProposal = _vs.proposals[proposalId_];

        newProposal.id = proposalId_;
        newProposal.remark = remark_;
        newProposal.callData = callData_;
        newProposal.relatedExpertPanel = _vs.targetPanel;
        newProposal.relatedVotingSituation = situation_;

        newProposal.target = _vs
            .daoParameterStorage
            .getDAOParameter(getVotingKey(situation_, VOTING_TARGET))
            .decodeString();

        require(
            callData_.length > 0 || newProposal.target.compare(_vs.DAO_VOTING_RESOURCE),
            "DAOVoting: The general voting must be called on the Voting contract."
        );

        _requireResourcePermission(newProposal.target, VOTE_FOR_PERMISSION);

        require(
            _vs.daoVault.getUserVotingPower(msg.sender, _vs.votingToken) >=
                _vs
                    .daoParameterStorage
                    .getDAOParameter(getVotingKey(situation_, VOTING_MIN_AMOUNT))
                    .decodeUint256(),
            "DAOVoting: The user voting power is too low to create a proposal."
        );

        newProposal.params.votingType = _getVotingType(getVotingKey(situation_, VOTING_TYPE));

        if (newProposal.params.votingType != VotingType.NON_RESTRICTED) {
            _checkRestriction();
        }

        uint256 endDate_ = block.timestamp +
            _vs
                .daoParameterStorage
                .getDAOParameter(getVotingKey(situation_, VOTING_PERIOD))
                .decodeUint256();

        newProposal.params.requiredQuorum = _vs
            .daoParameterStorage
            .getDAOParameter(getVotingKey(situation_, REQUIRED_QUORUM))
            .decodeUint256();

        newProposal.params.requiredMajority = _vs
            .daoParameterStorage
            .getDAOParameter(getVotingKey(situation_, REQUIRED_MAJORITY))
            .decodeUint256();

        newProposal.params.requiredVetoQuorum = _vs
            .daoParameterStorage
            .getDAOParameter(getVotingKey(situation_, REQUIRED_VETO_QUORUM))
            .decodeUint256();

        newProposal.params.votingEndTime = endDate_;

        if (_getVetoMembersCount(newProposal.target) > 0) {
            newProposal.params.vetoEndTime =
                endDate_ +
                _vs
                    .daoParameterStorage
                    .getDAOParameter(getVotingKey(situation_, VETO_PERIOD))
                    .decodeUint256();
        } else {
            newProposal.params.vetoEndTime = endDate_;
        }

        newProposal.params.proposalExecutionPeriod = _vs
            .daoParameterStorage
            .getDAOParameter(getVotingKey(situation_, PROPOSAL_EXECUTION_PERIOD))
            .decodeUint256();

        emit ProposalCreated(proposalId_, newProposal);

        return proposalId_;
    }

    /**
     * @dev Casts a vote in favor of the specified proposal.
     * @param proposalId_ The ID of the proposal to vote for.
     */
    function voteFor(uint256 proposalId_) external override onlyVotePermission(proposalId_) {
        _vote(proposalId_, VotingOption.FOR);
    }

    /**
     * @dev Casts a vote against the specified proposal.
     * @param proposalId_ The ID of the proposal to vote against.
     */
    function voteAgainst(uint256 proposalId_) external override onlyVotePermission(proposalId_) {
        _vote(proposalId_, VotingOption.AGAINST);
    }

    /**
     * @dev Vetoes the specified proposal.
     * @param proposalId_ The ID of the proposal to veto.
     */
    function veto(uint256 proposalId_) external override onlyVetoPermission(proposalId_) {
        VotingStorage storage _vs = getDAOVotingStorage();

        require(
            !_vs.hasUserVetoed[proposalId_][msg.sender],
            "DAOVoting: The eligible user has already vetoed."
        );
        require(
            getProposalStatus(proposalId_) == ProposalStatus.ACCEPTED,
            "DAOVoting: The proposal must be accepted to be vetoed."
        );

        _vs.hasUserVetoed[proposalId_][msg.sender] = true;

        ++_vs.proposals[proposalId_].counters.vetoesCount;
    }

    /**
     * @dev Executes the specified proposal.
     * @param proposalId_ The ID of the proposal to execute.
     */
    function executeProposal(uint256 proposalId_) external override {
        VotingStorage storage _vs = getDAOVotingStorage();

        require(
            getProposalStatus(proposalId_) == ProposalStatus.PASSED,
            "DAOVoting: The proposal must be passed to be executed."
        );

        DAOProposal storage proposal = _vs.proposals[proposalId_];

        proposal.executed = true;

        if (proposal.callData.length > 0) {
            (bool success_, ) = address(this).call(proposal.callData);
            require(success_, "DAOVoting: The proposal execution failed.");
        }
    }

    function _vote(uint256 proposalId_, VotingOption votingOption_) internal {
        VotingStorage storage _vs = getDAOVotingStorage();

        require(
            getProposalStatus(proposalId_) == ProposalStatus.PENDING,
            "DAOVoting: The proposal must be pending to be voted."
        );

        require(
            !_vs.hasUserVoted[proposalId_][msg.sender],
            "DAOVoting: The user has already voted."
        );

        _vs.hasUserVoted[proposalId_][msg.sender] = true;

        uint256 userVotingPower_ = _getAndLockUserVotingPower(proposalId_);

        if (votingOption_ == VotingOption.FOR) {
            _vs.proposals[proposalId_].counters.votedFor += userVotingPower_;
        } else {
            _vs.proposals[proposalId_].counters.votedAgainst += userVotingPower_;
        }
    }
}
