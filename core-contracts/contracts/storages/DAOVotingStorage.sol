// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import "@dlsl/dev-modules/utils/Globals.sol";
import "@dlsl/dev-modules/libs/data-structures/StringSet.sol";

import "../interfaces/IDAOVoting.sol";

import "../core/Globals.sol";
import "../core/DAOVault.sol";
import "../core/PermissionManager.sol";
import "../core/DAOParameterStorage.sol";

import "../libs/Parameters.sol";
import "../libs/StringHelper.sol";

/**
 * @title DAOVoting Storage
 */
abstract contract DAOVotingStorage is IDAOVoting {
    using ParameterCodec for *;
    using ArrayHelper for *;

    using ERC165Checker for address;

    using StringHelper for string;
    using StringSet for StringSet.Set;

    bytes32 public constant DAO_VOTING_STORAGE_SLOT =
        keccak256("diamond.standard.dao.voting.storage");

    string public constant VOTING_PERIOD = "votingPeriod";
    string public constant VETO_PERIOD = "vetoPeriod";
    string public constant PROPOSAL_EXECUTION_PERIOD = "proposalExecutionPeriod";
    string public constant REQUIRED_QUORUM = "requiredQuorum";
    string public constant REQUIRED_MAJORITY = "requiredMajority";
    string public constant REQUIRED_VETO_QUORUM = "requiredVetoQuorum";
    string public constant VOTING_TYPE = "votingType";
    string public constant VOTING_TARGET = "votingTarget";
    string public constant VOTING_MIN_AMOUNT = "votingMinAmount";

    struct VotingStorage {
        bool initialized;
        string DAO_VOTING_RESOURCE;
        string targetPanel;
        address votingToken;
        uint256 proposalCount;
        DAOVault daoVault;
        PermissionManager permissionManager;
        DAOParameterStorage daoParameterStorage;
        DAOMemberStorage daoMemberStorage;
        StringSet.Set votingSituations;
        mapping(uint256 => DAOProposal) proposals;
        mapping(uint256 => mapping(address => bool)) hasUserVoted;
        mapping(uint256 => mapping(address => bool)) hasUserVetoed;
    }

    modifier onlyCreateVotingPermission() {
        _requireVotingPermission(CREATE_VOTING_PERMISSION);
        _;
    }

    modifier onlyVotePermission(uint256 proposalId_) {
        _checkProposalExists(proposalId_);

        if (
            getDAOVotingStorage().proposals[proposalId_].params.votingType == VotingType.RESTRICTED
        ) {
            _checkRestriction();
        }

        _requireVotingPermission(VOTE_PERMISSION);
        _;
    }

    modifier onlyVetoPermission(uint256 proposalId_) {
        _checkProposalExists(proposalId_);
        _requireResourcePermission(
            getDAOVotingStorage().proposals[proposalId_].target,
            VETO_FOR_PERMISSION
        );
        _;
    }

    modifier onlyCreatePermission() {
        _requireVotingPermission(CREATE_PERMISSION);
        _;
    }

    modifier onlyDeletePermission() {
        _requireVotingPermission(DELETE_PERMISSION);
        _;
    }

    function getDAOVotingStorage() internal pure returns (VotingStorage storage _vs) {
        bytes32 position = DAO_VOTING_STORAGE_SLOT;

        assembly {
            _vs.slot := position
        }
    }

    /**
     * @inheritdoc IDAOVoting
     */
    function getVotingToken() external view returns (address) {
        return getDAOVotingStorage().votingToken;
    }

    /**
     * @inheritdoc IDAOVoting
     */
    function getProposal(uint256 proposalId_) external view override returns (DAOProposal memory) {
        return getDAOVotingStorage().proposals[proposalId_];
    }

    /**
     * @inheritdoc IDAOVoting
     */
    function getProposalList(
        uint256 offset_,
        uint256 limit_
    ) external view override returns (DAOProposal[] memory) {
        VotingStorage storage _vs = getDAOVotingStorage();

        uint256 proposalCount_ = _vs.proposalCount;

        if (offset_ >= proposalCount_) {
            return new DAOProposal[](0);
        }

        uint256 allocate_ = limit_;
        if (proposalCount_ < offset_ + limit_) {
            allocate_ = proposalCount_ - offset_;
        }

        DAOProposal[] memory proposalList_ = new DAOProposal[](allocate_);

        for (uint256 i = 0; i < allocate_; i++) {
            proposalList_[i] = _vs.proposals[proposalCount_ - 1 - offset_ - i];
        }

        return proposalList_;
    }

    /**
     * @inheritdoc IDAOVoting
     */
    function getProposalStatus(uint256 proposalId_) public view returns (ProposalStatus) {
        DAOProposal storage _proposal = getDAOVotingStorage().proposals[proposalId_];

        if (_proposal.params.votingEndTime == 0) {
            return ProposalStatus.NONE;
        }

        if (_proposal.executed) {
            return ProposalStatus.EXECUTED;
        }

        if (_isRestrictedVotingPassed(_proposal)) {
            return ProposalStatus.PASSED;
        }

        if (block.timestamp < _proposal.params.votingEndTime) {
            return ProposalStatus.PENDING;
        }

        if (
            _getCurrentQuorum(_proposal) <= _proposal.params.requiredQuorum ||
            _getCurrentMajority(_proposal) <= _proposal.params.requiredMajority ||
            _getCurrentVetoQuorum(_proposal) > _proposal.params.requiredVetoQuorum
        ) {
            return ProposalStatus.REJECTED;
        }

        if (block.timestamp < _proposal.params.vetoEndTime) {
            return ProposalStatus.ACCEPTED;
        }

        if (
            block.timestamp >
            _proposal.params.vetoEndTime + _proposal.params.proposalExecutionPeriod
        ) {
            return ProposalStatus.EXPIRED;
        }

        return ProposalStatus.PASSED;
    }

    /**
     * @inheritdoc IDAOVoting
     */
    function getProposalVotingStats(
        uint256 proposalId_
    ) external view override returns (VotingStats memory) {
        DAOProposal storage _proposal = getDAOVotingStorage().proposals[proposalId_];

        return
            VotingStats(
                _proposal.params.requiredQuorum,
                _getCurrentQuorum(_proposal),
                _proposal.params.requiredMajority,
                _getCurrentMajority(_proposal),
                _getCurrentVetoQuorum(_proposal),
                _proposal.params.requiredVetoQuorum
            );
    }

    /**
     * @inheritdoc IDAOVoting
     */
    function getVotingSituations() external view override returns (string[] memory) {
        return getDAOVotingStorage().votingSituations.values();
    }

    /**
     * @inheritdoc IDAOVoting
     */
    function getVotingSituationInfo(
        string calldata situation_
    ) external view override returns (DAOVotingValues memory) {
        DAOParameterStorage _pms = getDAOVotingStorage().daoParameterStorage;

        return
            DAOVotingValues({
                votingPeriod: _pms
                    .getDAOParameter(getVotingKey(situation_, VOTING_PERIOD))
                    .decodeUint256(),
                vetoPeriod: _pms
                    .getDAOParameter(getVotingKey(situation_, VETO_PERIOD))
                    .decodeUint256(),
                proposalExecutionPeriod: _pms
                    .getDAOParameter(getVotingKey(situation_, PROPOSAL_EXECUTION_PERIOD))
                    .decodeUint256(),
                requiredQuorum: _pms
                    .getDAOParameter(getVotingKey(situation_, REQUIRED_QUORUM))
                    .decodeUint256(),
                requiredMajority: _pms
                    .getDAOParameter(getVotingKey(situation_, REQUIRED_MAJORITY))
                    .decodeUint256(),
                requiredVetoQuorum: _pms
                    .getDAOParameter(getVotingKey(situation_, REQUIRED_VETO_QUORUM))
                    .decodeUint256(),
                votingType: _pms
                    .getDAOParameter(getVotingKey(situation_, VOTING_TYPE))
                    .decodeUint256(),
                votingTarget: _pms
                    .getDAOParameter(getVotingKey(situation_, VOTING_TARGET))
                    .decodeString(),
                votingMinAmount: _pms
                    .getDAOParameter(getVotingKey(situation_, VOTING_MIN_AMOUNT))
                    .decodeUint256()
            });
    }

    function _getAndLockUserVotingPower(uint256 proposalId_) internal virtual returns (uint256) {
        VotingStorage storage _vs = getDAOVotingStorage();

        if (_vs.proposals[proposalId_].params.votingType == VotingType.RESTRICTED) {
            return 1;
        }

        uint256 userVotingPower_ = _vs.daoVault.getUserVotingPower(msg.sender, _vs.votingToken);

        require(userVotingPower_ > 0, "DAOVoting: The user has no voting power.");

        _vs.daoVault.lock(
            msg.sender,
            _vs.votingToken,
            userVotingPower_,
            _vs.proposals[proposalId_].params.votingEndTime
        );

        return userVotingPower_;
    }

    function _checkRestriction() internal view virtual {
        require(
            getDAOVotingStorage().permissionManager.hasPermission(
                msg.sender,
                getDAOVotingStorage().DAO_VOTING_RESOURCE,
                EXPERT_PERMISSION
            ),
            "DAOVoting: Permission denied - only experts have access."
        );
    }

    function _getVetoMembersCount(string memory target_) internal view virtual returns (uint256) {
        return getDAOVotingStorage().permissionManager.getVetoMembersCount(target_);
    }

    function _getCurrentQuorum(
        DAOProposal storage proposal_
    ) internal view virtual returns (uint256) {
        uint256 votesCount_ = proposal_.counters.votedFor + proposal_.counters.votedAgainst;

        if (proposal_.params.votingType == VotingType.RESTRICTED) {
            return _calculatePercentage(votesCount_, _getExpertsCount());
        }

        return
            _calculatePercentage(
                votesCount_,
                getDAOVotingStorage().daoVault.getTokenSupply(getDAOVotingStorage().votingToken)
            );
    }

    function _getCurrentVetoQuorum(
        DAOProposal storage proposal_
    ) internal view virtual returns (uint256) {
        uint256 vetoMembersCount_ = _getVetoMembersCount(proposal_.target);

        return _calculatePercentage(proposal_.counters.vetoesCount, vetoMembersCount_);
    }

    function _getCurrentMajority(
        DAOProposal storage proposal_
    ) internal view virtual returns (uint256) {
        uint256 votesCount_ = proposal_.counters.votedFor + proposal_.counters.votedAgainst;

        return _calculatePercentage(proposal_.counters.votedFor, votesCount_);
    }

    function _getExpertsCount() private view returns (uint256) {
        return getDAOVotingStorage().daoMemberStorage.getMembers().length;
    }

    function _isRestrictedVotingPassed(
        DAOProposal storage proposal_
    ) internal view returns (bool) {
        bool isRestricted_ = proposal_.params.votingType == VotingType.RESTRICTED;
        bool isExpertsCountNotZero_ = _getExpertsCount() != 0;
        bool isQuorumReached_ = _getCurrentQuorum(proposal_) > proposal_.params.requiredQuorum;
        bool isMajorityReached_ = _calculatePercentage(
            proposal_.counters.votedFor,
            _getExpertsCount()
        ) > proposal_.params.requiredMajority;
        bool isVetoMembersExists_ = getDAOVotingStorage().permissionManager.getVetoMembersCount(
            proposal_.target
        ) > 0;

        if (
            isRestricted_ &&
            isExpertsCountNotZero_ &&
            isQuorumReached_ &&
            isMajorityReached_ &&
            !isVetoMembersExists_
        ) {
            return true;
        }

        return false;
    }

    function _checkProposalExists(uint256 proposalId_) internal view {
        require(
            getDAOVotingStorage().proposalCount > proposalId_,
            "DAOVoting: The proposal does not exist."
        );
    }

    function _requireVotingPermission(string memory permission_) internal view {
        require(
            getDAOVotingStorage().permissionManager.hasPermission(
                msg.sender,
                getDAOVotingStorage().DAO_VOTING_RESOURCE,
                permission_
            ),
            "DAOVoting: The sender is not allowed to perform the action, access denied."
        );
    }

    function _requireResourcePermission(
        string memory targetContractResource_,
        string memory permission_
    ) internal view {
        require(
            getDAOVotingStorage().permissionManager.hasPermission(
                msg.sender,
                targetContractResource_,
                permission_
            ),
            "DAOVoting: The sender is not allowed to perform the action on the target, access denied."
        );
    }

    function _getVotingType(string memory votingTypeKey_) internal view returns (VotingType) {
        return
            VotingType(
                getDAOVotingStorage()
                    .daoParameterStorage
                    .getDAOParameter(votingTypeKey_)
                    .decodeUint256()
            );
    }

    function _calculatePercentage(uint256 part, uint256 amount) internal pure returns (uint256) {
        if (amount == 0) {
            return 0;
        }

        return (part * PERCENTAGE_100) / amount;
    }
}
