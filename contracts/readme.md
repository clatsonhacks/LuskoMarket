# 🔮 LUKSO Prediction Market

A decentralized prediction market built on the **LUKSO blockchain**, using **Universal Profiles** for identity and **AI** for automated market resolution.

## 🚀 Features

- **Universal Profiles (LSP0)** for verified identities  
- **YES/NO Prediction Markets** with share trading and liquidity provision  
- **AI-Powered Resolution** via off-chain Groq AI  
- **Dispute Mechanism** for contested outcomes  
- **0.5% Platform Fee** for sustainability  

## 🧠 Smart Contracts

### `LuksoPredictionMarket.sol`
Handles:
- Market creation (question, expiry, IPFS hash)
- Share trading (YES/NO)
- Liquidity provision & rewards
- Resolution + Universal Profile checks

### `LuksoAIMarketResolver.sol`
Handles:
- Off-chain AI resolution calls
- Posting results + explanation on-chain

## 📍 Deployed Contracts

- `Prediction Market`: `0x039874bC68d71F4b6c20809850F963A57F5b49a7`  
- `AI Resolver`: `0x084A86593f882BacEEa616388569E6721fCd64cb`

## 🔄 Flow Overview

1. **Create Market** → Question + Duration + IPFS Details  
2. **Trade Shares** → Buy YES/NO using LYX  
3. **Add Liquidity** → Earn part of trading fees  
4. **AI Resolution** → AI returns outcome + explanation  
5. **Claim Rewards** → Winners claim based on share ratio  
6. **Dispute Outcome** → Admin reviews disputes if raised  

## 🧱 Architecture

- `MarketCore`: ID, creator, question, timing  
- `MarketState`: Active, Expired, Resolved, Disputed, Canceled  
- `MarketFinancials`: Shares, liquidity, IPFS hash  
- Tracks user positions: YES/NO shares + liquidity

## 🔐 Security

- `ReentrancyGuard` for safe transfers  
- `Pausable` for emergency shutdown  
- Admin-only critical functions  
- `SafeMath` to prevent overflows  

## 🧪 Setup & Deployment

### Requirements:
- LUKSO Universal Profile  
- Dev tools (Remix, Hardhat, or Truffle)  
- LYX for transactions

### Steps:
1. Deploy `LuksoPredictionMarket.sol`  
2. Deploy `LuksoAIMarketResolver.sol`  
3. Register resolver in main contract  
4. Create markets and interact  

## 🔭 Future Enhancements

- LMSR or dynamic pricing models  
- Multi-outcome markets  
- On-chain DAO governance  
- External data sources for AI  
- Participant token incentives  

## 📄 License

MIT

---

*Built for the **LUKSO Hackathon** as a proof-of-concept.*
