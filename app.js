document.addEventListener('DOMContentLoaded', function() {
    // Contract addresses from your deployment
    const PREDICTION_MARKET_ADDRESS = '0x039874bC68d71F4b6c20809850F963A57F5b49a7';
    const AI_RESOLVER_ADDRESS = '0x084A86593f882BacEEa616388569E6721fCd64cb';
    
    // Initialize sample data for demo purposes
    const sampleMarkets = [
        {
            id: 1,
            question: "Will ETH hit $5k before July 2025?",
            creator: "0x123...abc",
            createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
            yesShares: 12500,
            noShares: 7500,
            totalLiquidity: 5,
            status: "active"
        },
        {
            id: 2,
            question: "Will LUKSO be listed on a tier 1 exchange in Q3 2025?",
            creator: "0x456...def",
            createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
            expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days from now
            yesShares: 8000,
            noShares: 2000,
            totalLiquidity: 2.5,
            status: "active"
        },
        {
            id: 3,
            question: "Will LUKSO host a developer conference before the end of 2025?",
            creator: "0x789...ghi",
            createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
            expiresAt: Date.now() + 45 * 24 * 60 * 60 * 1000, // 45 days from now
            yesShares: 5000,
            noShares: 5000,
            totalLiquidity: 3,
            status: "active"
        }
    ];
    
    let currentAccount = null;
    let currentFilter = 'active';
    let currentMarket = null;
    let web3;
    let predictionMarketContract;
    let aiResolverContract;
    let selectedTradeType = 'yes';
    let availableProviders = [];
    
    // DOM Elements
    const connectButton = document.getElementById('connectButton');
    const profileInfo = document.getElementById('profileInfo');
    const addressDisplay = document.getElementById('address');
    const createMarketForm = document.getElementById('createMarketForm');
    const marketsList = document.getElementById('marketsList');
    const marketDetail = document.getElementById('marketDetail');
    const marketsSection = document.querySelector('.markets');
    const backToMarketsBtn = document.getElementById('backToMarkets');
    const filterButtons = document.querySelectorAll('.markets-filter button');
    const tradeTypeButtons = document.querySelectorAll('.trade-btn');
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const executeTradeBtn = document.getElementById('executeTrade');
    const addLiquidityBtn = document.getElementById('addLiquidity');
    const claimRewardsBtn = document.getElementById('claimRewards');
    
    // ABI for the contracts
    const predictionMarketABI = [
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_marketId",
                    "type": "uint256"
                }
            ],
            "name": "getMarketFinancials",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "yesShares",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "noShares",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "totalLiquidity",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "ipfsDetailsHash",
                    "type": "bytes"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_marketId",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "_outcome",
                    "type": "bool"
                }
            ],
            "name": "resolveMarket",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_question",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "_duration",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "_ipfsDetailsHash",
                    "type": "bytes"
                }
            ],
            "name": "createMarket",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_marketId",
                    "type": "uint256"
                }
            ],
            "name": "addLiquidity",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_marketId",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "_isYes",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "_amount",
                    "type": "uint256"
                }
            ],
            "name": "buyShares",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_marketId",
                    "type": "uint256"
                }
            ],
            "name": "claimRewards",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_marketId",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "_user",
                    "type": "address"
                }
            ],
            "name": "getUserPosition",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "yesShares",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "noShares",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "liquidityProvided",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    // EIP-6963 wallet connection setup
    window.addEventListener("eip6963:announceProvider", (event) => {
        availableProviders.push(event.detail);
    });

    // Dispatch event to request providers
    function requestEIP6963Providers() {
        window.dispatchEvent(new Event("eip6963:requestProvider"));
    }

    // Connect to LUKSO Universal Profile wallet
    async function connectWallet() {
        try {
            // First, try EIP-6963 providers (LUKSO compatible)
            requestEIP6963Providers();
            
            // Give providers a moment to announce themselves
            setTimeout(async () => {
                if (availableProviders.length > 0) {
                    // Use the first available provider
                    const providerDetail = availableProviders[0];
                    
                    try {
                        web3 = new Web3(providerDetail.provider);
                        const accounts = await web3.eth.requestAccounts();
                        
                        if (accounts.length > 0) {
                            handleSuccessfulConnection(accounts[0]);
                            showNotification(`Connected to ${providerDetail.info.name}!`, 'success');
                        }
                    } catch (err) {
                        console.error("EIP-6963 connection error:", err);
                        fallbackToLegacyConnection();
                    }
                } else {
                    // Fall back to traditional connection method
                    fallbackToLegacyConnection();
                }
            }, 500); // Short delay to collect providers
        } catch (error) {
            console.error('Connection error:', error);
            showNotification('Connection failed. Please try again.', 'error');
        }
    }
    
    // Fallback to legacy window.ethereum connection
    async function fallbackToLegacyConnection() {
        try {
            if (window.ethereum) {
                web3 = new Web3(window.ethereum);
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                if (accounts.length > 0) {
                    handleSuccessfulConnection(accounts[0]);
                    showNotification('Connected successfully!', 'success');
                }
            } else {
                showNotification('Please install a LUKSO-compatible wallet', 'error');
            }
        } catch (error) {
            console.error("Legacy connection error:", error);
            showNotification('Connection failed. Please try again.', 'error');
        }
    }
    
    // Handle successful wallet connection
    function handleSuccessfulConnection(account) {
        currentAccount = account;
        
        // Update UI
        connectButton.classList.add('hidden');
        profileInfo.classList.remove('hidden');
        addressDisplay.textContent = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        
        // Initialize contract
        predictionMarketContract = new web3.eth.Contract(predictionMarketABI, PREDICTION_MARKET_ADDRESS);
        
        // Refresh markets
        renderMarkets();
    }

    // Create a new market
    async function createMarket(event) {
        event.preventDefault();
        
        if (!currentAccount) {
            showNotification('Please connect your LUKSO profile first', 'error');
            return;
        }
        
        const question = document.getElementById('question').value;
        const duration = parseInt(document.getElementById('duration').value);
        const details = document.getElementById('details').value;
        
        if (!question || !duration) {
            showNotification('Please fill all required fields', 'error');
            return;
        }
        
        try {
            // In a real implementation, we would call the contract here
            // For demo, we'll just add to our sample data
            const newMarket = {
                id: sampleMarkets.length + 1,
                question: question,
                creator: currentAccount,
                createdAt: Date.now(),
                expiresAt: Date.now() + (duration * 24 * 60 * 60 * 1000),
                yesShares: 1000, // Initial liquidity shares
                noShares: 1000,  // Initial liquidity shares
                totalLiquidity: 1,
                status: "active"
            };
            
            sampleMarkets.push(newMarket);
            
            // Reset form
            document.getElementById('question').value = '';
            document.getElementById('duration').value = '30';
            document.getElementById('details').value = '';
            
            showNotification('Market created successfully!', 'success');
            renderMarkets();
        } catch (error) {
            console.error('Error creating market:', error);
            showNotification('Failed to create market. Please try again.', 'error');
        }
    }

    // Render markets based on current filter
    function renderMarkets() {
        marketsList.innerHTML = '';
        
        const filteredMarkets = sampleMarkets.filter(market => {
            if (currentFilter === 'active') return market.status === 'active';
            if (currentFilter === 'resolved') return market.status === 'resolved';
            if (currentFilter === 'my') return market.creator === currentAccount;
            return true;
        });
        
        if (filteredMarkets.length === 0) {
            marketsList.innerHTML = '<div class="no-markets">No markets found</div>';
            return;
        }
        
        filteredMarkets.forEach(market => {
            const yesPercentage = calculateProbability(market.yesShares, market.noShares).yes;
            const noPercentage = calculateProbability(market.yesShares, market.noShares).no;
            
            const marketCard = document.createElement('div');
            marketCard.className = 'market-card';
            marketCard.dataset.id = market.id;
            
            const expiryDate = new Date(market.expiresAt).toLocaleDateString();
            
            marketCard.innerHTML = `
                <div class="market-question">${market.question}</div>
                <div class="market-meta">
                    <span>Expires: ${expiryDate}</span>
                    <span>Liquidity: ${market.totalLiquidity} LYX</span>
                </div>
                <div class="market-probabilities">
                    <div class="probability yes">
                        <span class="label">YES</span>
                        <span class="value">${yesPercentage}%</span>
                    </div>
                    <div class="probability no">
                        <span class="label">NO</span>
                        <span class="value">${noPercentage}%</span>
                    </div>
                </div>
            `;
            
            marketCard.addEventListener('click', () => showMarketDetail(market.id));
            marketsList.appendChild(marketCard);
        });
    }

    // Calculate probability from shares
    function calculateProbability(yesShares, noShares) {
        const total = yesShares + noShares;
        if (total === 0) return { yes: 50, no: 50 };
        
        const yes = Math.round((yesShares / total) * 100);
        const no = 100 - yes;
        
        return { yes, no };
    }

    // Show market detail
    function showMarketDetail(marketId) {
        const market = sampleMarkets.find(m => m.id == marketId);
        if (!market) return;
        
        currentMarket = market;
        
        // Hide markets list and show detail view
        marketsSection.classList.add('hidden');
        marketDetail.classList.remove('hidden');
        
        // Populate market details
        document.getElementById('marketQuestion').textContent = market.question;
        document.getElementById('marketCreator').textContent = `Created by: ${market.creator.substring(0, 6)}...${market.creator.substring(market.creator.length - 4)}`;
        document.getElementById('marketExpiry').textContent = `Expires: ${new Date(market.expiresAt).toLocaleDateString()}`;
        
        // Set odds
        const probabilities = calculateProbability(market.yesShares, market.noShares);
        document.getElementById('yesOdds').textContent = `${probabilities.yes}%`;
        document.getElementById('noOdds').textContent = `${probabilities.no}%`;
        
        // Fetch and display user position
        if (currentAccount) {
            // In a real implementation, we would get this from the contract
            // For demo, we'll create a sample position
            const position = {
                yesShares: Math.floor(Math.random() * 100),
                noShares: Math.floor(Math.random() * 100),
                liquidityProvided: (Math.random() * 0.5).toFixed(2)
            };
            
            document.getElementById('yesSharesPosition').textContent = position.yesShares;
            document.getElementById('noSharesPosition').textContent = position.noShares;
            document.getElementById('liquidityPosition').textContent = `${position.liquidityProvided} LYX`;
        }
        
        // Show resolution panel for expired markets
        if (market.expiresAt < Date.now() || market.status === 'resolved') {
            document.getElementById('marketResolution').classList.remove('hidden');
            
            if (market.status === 'resolved') {
                document.getElementById('resolutionStatus').textContent = 'Resolved';
                document.getElementById('claimRewards').classList.remove('hidden');
                
                // Request AI analysis for resolved market
                fetchAIAnalysis(market.id);
            } else {
                document.getElementById('resolutionStatus').textContent = 'Pending Resolution';
                document.getElementById('claimRewards').classList.add('hidden');
            }
        } else {
            document.getElementById('marketResolution').classList.add('hidden');
        }
    }

    // Back to markets list
    function backToMarkets() {
        marketDetail.classList.add('hidden');
        marketsSection.classList.remove('hidden');
        currentMarket = null;
    }

    // Filter markets
    function filterMarkets(filter) {
        currentFilter = filter;
        renderMarkets();
        
        // Update active button
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
    }

    // Switch trade type
    function switchTradeType(type) {
        selectedTradeType = type;
        
        // Update active button
        tradeTypeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    }

    // Switch tab
    function switchTab(tab) {
        // Update active tab button
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Show active tab content
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    }

    // Execute trade function
    async function handleTrade() {
        if (!currentAccount || !currentMarket) {
            showNotification('Please connect your wallet and select a market', 'error');
            return;
        }
        
        const amount = parseFloat(document.getElementById('tradeAmount').value);
        if (isNaN(amount) || amount <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return;
        }
        
        try {
            // In a real implementation, we would call the contract here
            // For demo, we'll just update our UI
            const marketIndex = sampleMarkets.findIndex(m => m.id === currentMarket.id);
            
            if (selectedTradeType === 'yes') {
                sampleMarkets[marketIndex].yesShares += Math.floor(amount * 1000);  // Simulate shares calculation
            } else {
                sampleMarkets[marketIndex].noShares += Math.floor(amount * 1000);  // Simulate shares calculation
            }
            
            showNotification(`Successfully bought ${selectedTradeType.toUpperCase()} shares!`, 'success');
            
            // Update market details
            showMarketDetail(currentMarket.id);
        } catch (error) {
            console.error('Trade error:', error);
            showNotification('Trade failed. Please try again.', 'error');
        }
    }

    // Add liquidity
    async function addLiquidity() {
        if (!currentAccount || !currentMarket) {
            showNotification('Please connect your wallet and select a market', 'error');
            return;
        }
        
        const amount = parseFloat(document.getElementById('liquidityAmount').value);
        if (isNaN(amount) || amount <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return;
        }
        
        try {
            // In a real implementation, we would call the contract here
            // For demo, we'll just update our UI
            const marketIndex = sampleMarkets.findIndex(m => m.id === currentMarket.id);
            sampleMarkets[marketIndex].totalLiquidity += amount;
            
            // Liquidity affects both yes and no shares equally
            sampleMarkets[marketIndex].yesShares += Math.floor(amount * 500);
            sampleMarkets[marketIndex].noShares += Math.floor(amount * 500);
            
            showNotification(`Successfully added ${amount} LYX liquidity!`, 'success');
            
            // Update market details
            showMarketDetail(currentMarket.id);
        } catch (error) {
            console.error('Liquidity error:', error);
            showNotification('Failed to add liquidity. Please try again.', 'error');
        }
    }

    // Claim rewards
    async function claimRewards() {
        if (!currentAccount || !currentMarket) {
            showNotification('Please connect your wallet and select a market', 'error');
            return;
        }
        
        try {
            // In a real implementation, we would call the contract here
            showNotification('Rewards claimed successfully!', 'success');
            claimRewardsBtn.textContent = 'Rewards Claimed';
            claimRewardsBtn.disabled = true;
        } catch (error) {
            console.error('Claim error:', error);
            showNotification('Failed to claim rewards. Please try again.', 'error');
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.getElementById('notificationContainer').appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Fetch AI analysis for a resolved market
    async function fetchAIAnalysis(marketId) {
        try {
            // In a real implementation, we would call the AI service here
            // For demo, we'll simulate an AI response
            setTimeout(() => {
                const aiAnalysisElement = document.getElementById('aiAnalysis');
                
                // Simulate different AI analyses based on market ID
                if (marketId % 2 === 0) {
                    aiAnalysisElement.innerHTML = `
                        <strong>Market Question Analysis:</strong>
                        <p>Based on verified data sources, this market has been resolved to YES. 
                        Multiple reliable sources confirm that the event described in the market question did occur
                        within the specified timeframe.</p>
                        <p>Confidence Level: High (95%)</p>
                    `;
                } else {
                    aiAnalysisElement.innerHTML = `
                        <strong>Market Question Analysis:</strong>
                        <p>After thorough evaluation of credible sources, this market has been resolved to NO.
                        There is insufficient evidence that the event described in the market question occurred
                        within the specified parameters.</p>
                        <p>Confidence Level: High (92%)</p>
                    `;
                }
            }, 1500);
        } catch (error) {
            console.error('AI Analysis error:', error);
            document.getElementById('aiAnalysis').textContent = 'Error fetching AI analysis. Please try again later.';
        }
    }
    
    // Event listeners
    connectButton.addEventListener('click', connectWallet);
    createMarketForm.addEventListener('submit', createMarket);
    backToMarketsBtn.addEventListener('click', backToMarkets);
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => filterMarkets(button.dataset.filter));
    });
    
    tradeTypeButtons.forEach(button => {
        button.addEventListener('click', () => switchTradeType(button.dataset.type));
    });
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    executeTradeBtn.addEventListener('click', handleTrade);
    addLiquidityBtn.addEventListener('click', addLiquidity);
    claimRewardsBtn.addEventListener('click', claimRewards);
    
    // Initialize
    renderMarkets();
});
