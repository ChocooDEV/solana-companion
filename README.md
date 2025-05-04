# Solana Companion

This is a [Next.js](https://nextjs.org) project that creates digital companions that grow with you on your Solana blockchain journey. Your companion evolves as you interact with the Solana blockchain, earning XP, leveling up and much more


## Features

- **Dynamic Companion Mood**: Your companion's mood changes based on your blockchain activity
- **Level Up and Evolve**: Gain experience points through on-chain actions


## Tech Stack

- **Next.js**: React framework for the frontend
- **Tailwind CSS**: For styling and animations
- **Solana Web3.js**: For blockchain interactions
- **Metaplex**: For NFT creation and management
- **Irys**: For permanent decentralized storage
- **Helius**: For transaction history and AI explanations


## Getting Started

First run
```
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result


## Environment Variables

Create a `.env` file in the root directory with the following variables:
```
RPC_API_URL=https://api.devnet.solana.com
PRIVATE_KEY=your_private_key
COLLECTION_ADDRESS=your_collection_address
HELIUS_API_KEY=your_helius_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```


## Scripts

- `app/scripts/create-collection.ts`: Creates a new NFT collection for companions
- `app/scripts/mint-core.ts`: Utility for minting Core NFTs


## API Endpoints
- `/api/mint-companion`: Handles the minting of new companions
- `/api/update-companion`: Updates companion metadata
- `/api/get-companion`: Retrieves companion data
- `/api/calculate-experience`: Calculates XP based on wallet activity
- `/api/check-companion`: Checks if a wallet has a companion
- `/api/transaction-details`: Gets detailed transaction information