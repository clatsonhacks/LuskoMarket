# 🔮 LUKSO Prediction Market

A decentralized prediction market DApp built on the **LUKSO blockchain**, leveraging **Universal Profiles** for verified identities and **Groq AI** for automated, confidence-based market resolution.


## 🚀 Features

- **Universal Profile Wallet Integration** (EIP-6963)
- **YES/NO Prediction Markets** with LYX-based trading
- **AI-Powered Resolution** (via Groq AI)
- **Dispute Mechanism** for contested resolutions
- **Liquidity Provision & Rewards**
- **Real-Time Market Analytics**
- **User Position Tracking**
- **Notification System** for UX feedback

---

## 🧠 Smart Contracts

### `LuksoPredictionMarket.sol`
Handles:
- Market creation (question, duration, IPFS hash)
- YES/NO share trading
- Liquidity management
- Reward claims
- Universal Profile verification

### `LuksoAIMarketResolver.sol`
Handles:
- Groq AI integration (off-chain)
- Resolution result submission on-chain
- Storing explanation and confidence

📍 **Deployed Contracts**
- **Prediction Market**: `0x039874bC68d71F4b6c20809850F963A57F5b49a7`
- **AI Resolver**: `0x084A86593f882BacEEa616388569E6721fCd64cb`

---

## 🔄 Workflow

### 🔌 1. Connect Wallet
- Connect LUKSO Universal Profile via EIP-6963
- Fallback to legacy wallet connection if unavailable

### 🧾 2. Create Market
- User provides question, duration, IPFS hash
- Market appears in active list after creation

### 💱 3. Trade or Add Liquidity
- Trade YES/NO shares using LYX
- Add liquidity to market pool
- Track personal holdings and market share

### 🤖 4. AI Resolution
- Once market expires, Groq AI analyzes outcome
- Returns decision + explanation + confidence score
- Users can dispute result if needed

### 💰 5. Claim Rewards
- Winning users claim rewards based on final outcome and share ratio

---

## 🧱 Architecture

- **MarketCore**: ID, creator, question, expiry
- **MarketState**: Active, Resolved, Expired, Disputed, Cancelled
- **MarketFinancials**: YES/NO shares, liquidity pool, IPFS details
- **UserState**: YES/NO shares + liquidity positions

---

## 🔐 Security Features

- `ReentrancyGuard` for secure withdrawals
- `Pausable` for emergency controls
- Admin-only functions protected
- `SafeMath` usage to prevent overflows

---

## ⚙️ Setup & Deployment

### Requirements
- LUKSO Universal Profile wallet
- LYX tokens for deployment/interaction
- Dev tools (Remix, Hardhat, or Truffle)

### Steps
1. Deploy `contracts/LuksoPredictionMarket.sol`
2. Deploy `contracts/LuksoAIMarketResolver.sol`
3. Register resolver address in main market contract
4. Configure frontend (contract addresses, ABIs)
5. Open `index.html` and interact with the app

---

## 💡 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Web3 Libraries**: 
  - Web3.js `v1.8.2`
  - ethers.js `v5.7.2`
  - EIP-6963 integration
- **Blockchain**: LUKSO with Universal Profiles (LSP0)
- **AI**: Groq AI for market resolution
- **Storage**: IPFS for storing market metadata
- **Contracts**: Solidity (deployed on LUKSO)

---

## 🔭 Future Enhancements

- Dynamic pricing models (e.g. LMSR, CPMM)
- Multi-outcome markets
- DAO-based governance for dispute handling
- External oracles to support AI decisions
- Token-based incentives for market participants


> 🏁 Built for the **LUKSO Hackathon** — A decentralized, AI-powered prediction platform demonstrating the fusion of Universal Profiles, smart contracts, and Groq-based automated analysis.
