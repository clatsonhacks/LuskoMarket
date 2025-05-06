// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@lukso/lsp-smart-contracts/contracts/LSP0ERC725Account/LSP0ERC725Account.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LuksoPredictionMarket
 * @dev A prediction market platform built on LUKSO that leverages Universal Profiles
 */
contract LuksoPredictionMarket is ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    // Platform fee rate (0.5% = 50 basis points)
    uint256 public constant PLATFORM_FEE_RATE = 50;
    uint256 public constant BASIS_POINTS = 10000;
    
    address public admin;
    address public feesCollector;
    
    // Mapping from market ID to Market
    mapping(uint256 => Market) public markets;
    uint256 public marketsCount;
    
    // Mapping from market ID to user addresses to positions
    mapping(uint256 => mapping(address => Position)) public positions;
    
    // Mapping to track if a Universal Profile is verified
    mapping(address => bool) public verifiedProfiles;

    // Breaking up the Market struct into smaller components to reduce stack variables
    struct MarketCore {
        uint256 id;
        string question;
        uint256 createdAt;
        uint256 expiresAt;
        address creator;
    }
    
    struct MarketState {
        uint256 resolvedAt;
        bool resolved;
        bool outcome; // true = YES, false = NO
        MarketStatus status;
    }
    
    struct MarketFinancials {
        uint256 yesShares;
        uint256 noShares;
        uint256 totalLiquidity;
        bytes ipfsDetailsHash; // For storing additional market details
    }
    
    // Combined Market struct that references the smaller structs
    struct Market {
        MarketCore core;
        MarketState state;
        MarketFinancials financials;
    }
    
    struct Position {
        uint256 yesShares;
        uint256 noShares;
        uint256 liquidityProvided;
    }
    
    enum MarketStatus {
        Active,
        Expired,
        Resolved,
        Disputed,
        Canceled
    }

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 expiresAt,
        bytes ipfsDetailsHash
    );
    
    event PositionTaken(
        uint256 indexed marketId,
        address indexed user,
        bool isYes,
        uint256 shares,
        uint256 cost
    );
    
    event LiquidityAdded(
        uint256 indexed marketId,
        address indexed provider,
        uint256 amount
    );
    
    event LiquidityRemoved(
        uint256 indexed marketId,
        address indexed provider,
        uint256 amount
    );
    
    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 resolvedAt
    );
    
    event RewardsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );
    
    event ProfileVerified(address indexed userProfile);
    
    event MarketDisputed(
        uint256 indexed marketId,
        address indexed disputer,
        string reason
    );

    constructor(address _feesCollector) {
        admin = msg.sender;
        feesCollector = _feesCollector;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier marketExists(uint256 _marketId) {
        require(_marketId < marketsCount && _marketId >= 0, "Market does not exist");
        _;
    }
    
    modifier marketActive(uint256 _marketId) {
        require(markets[_marketId].state.status == MarketStatus.Active, "Market is not active");
        require(block.timestamp < markets[_marketId].core.expiresAt, "Market has expired");
        _;
    }
    
    modifier marketNotResolved(uint256 _marketId) {
        require(!markets[_marketId].state.resolved, "Market already resolved");
        _;
    }
    
    modifier isVerifiedProfile() {
        require(verifiedProfiles[msg.sender], "Must use a verified Universal Profile");
        _;
    }

    /**
     * @dev Create a new prediction market
     * @param _question The question for the prediction market
     * @param _duration Duration in seconds for how long the market will be active
     * @param _ipfsDetailsHash IPFS hash containing detailed market information
     * @return The ID of the newly created market
     */
    function createMarket(
        string memory _question,
        uint256 _duration,
        bytes memory _ipfsDetailsHash
    ) external isVerifiedProfile whenNotPaused returns (uint256) {
        require(bytes(_question).length > 0, "Question cannot be empty");
        require(_duration >= 1 hours, "Duration must be at least 1 hour");
        
        uint256 marketId = marketsCount;
        
        // Initialize market with its component structs
        Market storage market = markets[marketId];
        
        // Set core data
        market.core.id = marketId;
        market.core.question = _question;
        market.core.createdAt = block.timestamp;
        market.core.expiresAt = block.timestamp + _duration;
        market.core.creator = msg.sender;
        
        // Set state data
        market.state.resolvedAt = 0;
        market.state.resolved = false;
        market.state.outcome = false;
        market.state.status = MarketStatus.Active;
        
        // Set financial data
        market.financials.yesShares = 0;
        market.financials.noShares = 0;
        market.financials.totalLiquidity = 0;
        market.financials.ipfsDetailsHash = _ipfsDetailsHash;
        
        emit MarketCreated(
            marketId,
            msg.sender,
            _question,
            block.timestamp + _duration,
            _ipfsDetailsHash
        );
        
        marketsCount++;
        return marketId;
    }

    /**
     * @dev Buy shares for a prediction outcome
     * @param _marketId Market ID
     * @param _isYes True for YES outcome, false for NO outcome
     * @param _amount Amount of LYX to spend
     */
    function buyShares(
        uint256 _marketId,
        bool _isYes,
        uint256 _amount
    ) 
        external 
        payable
        nonReentrant
        marketExists(_marketId)
        marketActive(_marketId)
        isVerifiedProfile
        whenNotPaused
    {
        require(msg.value == _amount, "Sent value does not match amount");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Separate calculation to reduce stack depth
        uint256 shares = calculateSharesFromCost(_marketId, _isYes, _amount);
        require(shares > 0, "Not enough shares to purchase");
        
        // Update market state
        _updateMarketShares(_marketId, _isYes, shares);
        
        // Update position
        _updateUserPosition(_marketId, msg.sender, _isYes, shares);
        
        // Process fees and update liquidity
        _processFeeAndLiquidity(_marketId, _amount);
        
        emit PositionTaken(_marketId, msg.sender, _isYes, shares, _amount);
    }
    
    /**
     * @dev Internal function to update market shares
     */
    function _updateMarketShares(uint256 _marketId, bool _isYes, uint256 _shares) internal {
        if (_isYes) {
            markets[_marketId].financials.yesShares = markets[_marketId].financials.yesShares.add(_shares);
        } else {
            markets[_marketId].financials.noShares = markets[_marketId].financials.noShares.add(_shares);
        }
    }
    
    /**
     * @dev Internal function to update user position
     */
    function _updateUserPosition(uint256 _marketId, address _user, bool _isYes, uint256 _shares) internal {
        Position storage position = positions[_marketId][_user];
        if (_isYes) {
            position.yesShares = position.yesShares.add(_shares);
        } else {
            position.noShares = position.noShares.add(_shares);
        }
    }
    
    /**
     * @dev Internal function to process fee and update liquidity
     */
    function _processFeeAndLiquidity(uint256 _marketId, uint256 _amount) internal {
        // Calculate and transfer platform fee
        uint256 platformFee = _amount.mul(PLATFORM_FEE_RATE).div(BASIS_POINTS);
        if (platformFee > 0) {
            (bool feeSuccess, ) = payable(feesCollector).call{value: platformFee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        // Add remaining amount to market liquidity
        uint256 remainingAmount = _amount.sub(platformFee);
        markets[_marketId].financials.totalLiquidity = markets[_marketId].financials.totalLiquidity.add(remainingAmount);
    }

    /**
     * @dev Add liquidity to a market
     * @param _marketId Market ID
     */
    function addLiquidity(uint256 _marketId) 
        external 
        payable
        nonReentrant
        marketExists(_marketId)
        marketActive(_marketId)
        isVerifiedProfile
        whenNotPaused
    {
        require(msg.value > 0, "Must provide liquidity");
        
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][msg.sender];
        
        // Add to market liquidity
        market.financials.totalLiquidity = market.financials.totalLiquidity.add(msg.value);
        position.liquidityProvided = position.liquidityProvided.add(msg.value);
        
        emit LiquidityAdded(_marketId, msg.sender, msg.value);
    }

    /**
     * @dev Resolve a market with a specific outcome
     * @param _marketId Market ID
     * @param _outcome The outcome (true = YES, false = NO)
     */
    function resolveMarket(uint256 _marketId, bool _outcome) 
        external 
        onlyAdmin 
        marketExists(_marketId)
        marketNotResolved(_marketId)
    {
        Market storage market = markets[_marketId];
        require(block.timestamp >= market.core.expiresAt, "Market has not expired yet");
        
        market.state.resolved = true;
        market.state.outcome = _outcome;
        market.state.resolvedAt = block.timestamp;
        market.state.status = MarketStatus.Resolved;
        
        emit MarketResolved(_marketId, _outcome, block.timestamp);
    }

    /**
     * @dev Claim rewards from a resolved market
     * @param _marketId Market ID
     */
    function claimRewards(uint256 _marketId) 
        external
        nonReentrant
        marketExists(_marketId)
        isVerifiedProfile
    {
        Market storage market = markets[_marketId];
        require(market.state.resolved, "Market not resolved yet");
        
        Position storage position = positions[_marketId][msg.sender];
        
        // Calculate reward based on winning outcome (split to reduce stack depth)
        uint256 reward = _calculateReward(_marketId, msg.sender);
        require(reward > 0, "No rewards to claim");
        
        // Reset the user's position after claiming
        if (market.state.outcome) { // YES won
            position.yesShares = 0;
        } else { // NO won
            position.noShares = 0;
        }
        position.liquidityProvided = 0;
        
        // Send reward to user
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit RewardsClaimed(_marketId, msg.sender, reward);
    }

    /**
     * @dev Internal function to calculate rewards
     */
    function _calculateReward(uint256 _marketId, address _user) internal view returns (uint256) {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][_user];
        uint256 reward = 0;
        
        if (market.state.outcome) { // YES won
            if (market.financials.yesShares > 0) {
                reward = position.yesShares.mul(market.financials.totalLiquidity).div(market.financials.yesShares);
            }
        } else { // NO won
            if (market.financials.noShares > 0) {
                reward = position.noShares.mul(market.financials.totalLiquidity).div(market.financials.noShares);
            }
        }
        
        // Add back liquidity provided by this user
        reward = reward.add(position.liquidityProvided);
        
        return reward;
    }

    /**
     * @dev Verify a Universal Profile for use with the platform
     * @param _profileAddress The address of the Universal Profile to verify
     */
    function verifyProfile(address payable _profileAddress) external onlyAdmin {
        // Check if the address is a valid Universal Profile (LSP0)
        require(isUniversalProfile(_profileAddress), "Address is not a Universal Profile");
        
        verifiedProfiles[_profileAddress] = true;
        emit ProfileVerified(_profileAddress);
    }
    
    /**
     * @dev Helper function to check if an address is a Universal Profile
     * @param _address The address to check
     * @return Whether the address is a Universal Profile
     */
    function isUniversalProfile(address payable _address) public view returns (bool) {
        // Check if the address implements the required ERC725Y interface
        try LSP0ERC725Account(_address).supportsInterface(0x9f3401f1) returns (bool result) {
            return result;
        } catch {
            return false;
        }
    }

    /**
     * @dev Calculate the number of shares to issue based on cost
     * @param _marketId Market ID
     * @param _isYes Whether the position is YES
     * @param _cost The cost in LYX
     * @return The number of shares to issue
     */
    function calculateSharesFromCost(
        uint256 _marketId,
        bool _isYes,
        uint256 _cost
    ) public view returns (uint256) {
        Market storage market = markets[_marketId];
        
        // Simple linear model for share calculation
        // In a real implementation, you would use a more sophisticated algorithm like LMSR
        if (_isYes) {
            if (market.financials.yesShares == 0) {
                return _cost.mul(100); // Initial shares have higher value
            }
            return _cost.mul(1e18).div(market.financials.yesShares.add(1));
        } else {
            if (market.financials.noShares == 0) {
                return _cost.mul(100); // Initial shares have higher value
            }
            return _cost.mul(1e18).div(market.financials.noShares.add(1));
        }
    }

    /**
     * @dev Get basic details of a market
     * @param _marketId Market ID
     */
    function getMarketBasicDetails(uint256 _marketId) 
        external 
        view 
        marketExists(_marketId)
        returns (
            uint256 id,
            string memory question,
            uint256 createdAt,
            uint256 expiresAt,
            address creator
        )
    {
        MarketCore storage core = markets[_marketId].core;
        return (
            core.id,
            core.question,
            core.createdAt,
            core.expiresAt,
            core.creator
        );
    }
    
    /**
     * @dev Get market state information
     * @param _marketId Market ID
     */
    function getMarketState(uint256 _marketId) 
        external 
        view 
        marketExists(_marketId)
        returns (
            uint256 resolvedAt,
            bool resolved,
            bool outcome,
            MarketStatus status
        )
    {
        MarketState storage state = markets[_marketId].state;
        return (
            state.resolvedAt,
            state.resolved,
            state.outcome,
            state.status
        );
    }
    
    /**
     * @dev Get market financial information
     * @param _marketId Market ID
     */
    function getMarketFinancials(uint256 _marketId) 
        external 
        view 
        marketExists(_marketId)
        returns (
            uint256 yesShares,
            uint256 noShares,
            uint256 totalLiquidity,
            bytes memory ipfsDetailsHash
        )
    {
        MarketFinancials storage financials = markets[_marketId].financials;
        return (
            financials.yesShares,
            financials.noShares,
            financials.totalLiquidity,
            financials.ipfsDetailsHash
        );
    }

    /**
     * @dev Get a user's position in a specific market
     * @param _marketId Market ID
     * @param _user User address
     */
    function getUserPosition(uint256 _marketId, address _user)
        external
        view
        marketExists(_marketId)
        returns (uint256 yesShares, uint256 noShares, uint256 liquidityProvided)
    {
        Position storage position = positions[_marketId][_user];
        return (position.yesShares, position.noShares, position.liquidityProvided);
    }

    /**
     * @dev File a dispute for a market resolution
     * @param _marketId Market ID
     * @param _reason Reason for dispute
     */
    function disputeMarket(uint256 _marketId, string memory _reason)
        external
        marketExists(_marketId)
        isVerifiedProfile
    {
        Market storage market = markets[_marketId];
        require(market.state.resolved, "Market not resolved yet");
        require(positions[_marketId][msg.sender].yesShares > 0 || positions[_marketId][msg.sender].noShares > 0, 
            "Only participants can dispute");
        
        market.state.status = MarketStatus.Disputed;
        
        emit MarketDisputed(_marketId, msg.sender, _reason);
    }

    /**
     * @dev Change platform administrator
     * @param _newAdmin New admin address
     */
    function changeAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
    
    /**
     * @dev Change fee collector address
     * @param _newCollector New fee collector address
     */
    function changeFeesCollector(address _newCollector) external onlyAdmin {
        require(_newCollector != address(0), "Invalid address");
        feesCollector = _newCollector;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    /**
     * @dev Cancel a market (admin only)
     * @param _marketId Market ID
     */
    function cancelMarket(uint256 _marketId) 
        external 
        onlyAdmin 
        marketExists(_marketId)
        marketNotResolved(_marketId)
    {
        markets[_marketId].state.status = MarketStatus.Canceled;
    }

    // Fallback and receive functions
    receive() external payable {}
    fallback() external payable {}
}