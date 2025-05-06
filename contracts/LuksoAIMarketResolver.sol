// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Interface for the LuksoPredictionMarket contract
interface ILuksoPredictionMarket {
    function resolveMarket(uint256 _marketId, bool _outcome) external;
    function getMarketFinancials(uint256 _marketId) external view returns (
        uint256 yesShares,
        uint256 noShares,
        uint256 totalLiquidity,
        bytes memory ipfsDetailsHash
    );
}

/**
 * @title LuksoAIMarketResolver
 * @dev Contract to handle AI-based resolution of prediction markets
 * This will interact with the off-chain Groq AI agent
 */
contract LuksoAIMarketResolver {
    address public admin;
    address payable public marketContract;
    mapping(uint256 => string) public resolutionExplanations;
    
    event MarketResolutionRequested(uint256 indexed marketId, bytes ipfsDetailsHash);
    event MarketResolutionCompleted(uint256 indexed marketId, bool outcome, string explanation);
    
    constructor(address payable _marketContract) {
        admin = msg.sender;
        marketContract = _marketContract;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    /**
     * @dev Request resolution for a market from the AI system
     * @param _marketId Market ID to resolve
     */
    function requestResolution(uint256 _marketId) external onlyAdmin {
        // Get market financial details from the main contract
        (
            ,
            ,
            ,
            bytes memory ipfsDetailsHash
        ) = ILuksoPredictionMarket(marketContract).getMarketFinancials(_marketId);
        
        // Emit event that off-chain AI agent will listen for
        emit MarketResolutionRequested(_marketId, ipfsDetailsHash);
    }
    
    /**
     * @dev Submit resolution result from the AI system (called by admin after AI evaluation)
     * @param _marketId Market ID that was resolved
     * @param _outcome Resolution outcome (true=YES, false=NO)
     * @param _explanation Explanation for the resolution
     */
    function submitResolution(
        uint256 _marketId,
        bool _outcome,
        string memory _explanation
    ) external onlyAdmin {
        // Save the explanation
        resolutionExplanations[_marketId] = _explanation;
        
        // Call the main contract to resolve the market
        ILuksoPredictionMarket(marketContract).resolveMarket(_marketId, _outcome);
        
        emit MarketResolutionCompleted(_marketId, _outcome, _explanation);
    }
    
    /**
     * @dev Get explanation for a resolved market
     * @param _marketId Market ID
     * @return Resolution explanation
     */
    function getResolutionExplanation(uint256 _marketId) external view returns (string memory) {
        return resolutionExplanations[_marketId];
    }
    
    /**
     * @dev Update market contract address
     * @param _newMarketContract New market contract address
     */
    function updateMarketContract(address payable _newMarketContract) external onlyAdmin {
        require(_newMarketContract != address(0), "Invalid address");
        marketContract = _newMarketContract;
    }
    
    /**
     * @dev Change platform administrator
     * @param _newAdmin New admin address
     */
    function changeAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}