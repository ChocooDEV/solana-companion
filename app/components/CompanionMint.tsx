'use client';

import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { CompanionChoice } from '../types/companion';
import { Connection, Transaction, Message, PublicKey } from '@solana/web3.js';

const companionChoices: CompanionChoice[] = [
  {
    id: 1,
    name: "Fluffy",
    image: "/companions/companion1.png",
    description: "A friendly and energetic companion that loves to play."
  },
  {
    id: 2,
    name: "Sparky",
    image: "/companions/companion2.png",
    description: "A brave and adventurous companion with a fiery personality."
  },
  {
    id: 3,
    name: "Misty",
    image: "/companions/companion3.png",
    description: "A calm and wise companion that brings peace wherever it goes."
  }
];

export const CompanionMint: FC = () => {
  const wallet = useWallet();
  const { publicKey, signTransaction } = wallet;
  const [name, setName] = useState('');
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionChoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleMint = async () => {
    if (!publicKey || !selectedCompanion || !name.trim() || !signTransaction) {
      setError('Please connect your wallet, select a companion, and provide a name.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCurrentStep('Preparing your companion...');

    try {
      // Create companion data
      const companion = {
        name: name.trim(),
        dateOfBirth: new Date().toISOString(),
        image: selectedCompanion.image,
        description: selectedCompanion.description,
        experience: 0,
        level: 0,
        evolution: 0,
        mood: "Happy",
        attributes: [
          { trait_type: "Toys", value: "None" },
          { trait_type: "Background", value: "None" }
        ]
      };

      // Step 1: Get funding transaction
      setCurrentStep('Preparing funding transaction...');
      const fundingResponse = await fetch(`/api/mint-companion?walletAddress=${publicKey.toString()}`);
      const fundingResult = await fundingResponse.json();
      
      if (!fundingResult.success) {
        throw new Error(fundingResult.error || 'Failed to prepare funding transaction');
      }
      
      // Check balance before proceeding
      setCurrentStep('Checking wallet balance...');
      
      // Import the getSolanaConnection function
      const { getSolanaConnection } = await import('../utils/solanaConnection');
      const connection = await getSolanaConnection('confirmed');
      
      // Check if connection is valid before using it
      if (connection && typeof connection.getBalance === 'function') {
        const balance = await connection.getBalance(new PublicKey(publicKey));
        const requiredAmount = Number(fundingResult.estimatedCost) + 0.01; // Add extra for transaction fees
        
        if (balance / 1e9 < requiredAmount) {
          throw new Error(`Insufficient balance. You need at least ${requiredAmount} SOL but have ${balance / 1e9} SOL.`);
        }
      } else {
        console.error('Invalid connection object:', connection);
        throw new Error('Failed to get a valid Solana connection');
      }
      
      // Sign the funding transaction
      setCurrentStep('Signing funding transaction...');
      
      // Deserialize the transaction
      const fundingTxBuffer = Buffer.from(fundingResult.fundingTransaction, 'base64');
      const fundingTx = Transaction.from(fundingTxBuffer);
      
      const signedFundingTx = await signTransaction(fundingTx);
      
      // Submit the funding transaction
      setCurrentStep('Submitting funding transaction...');
      let fundingSignature;
      try {
        fundingSignature = await connection.sendRawTransaction(
          signedFundingTx.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );
        
        // Wait for confirmation
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature: fundingSignature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        });
      } catch (err) {
        console.error('Transaction error:', err);
        if (err instanceof Error && err.message.includes('insufficient funds for rent')) {
          throw new Error('Transaction failed: Not enough SOL to cover rent for new account creation. Please add more SOL to your wallet.');
        } else {
          throw err;
        }
      }

      if (!fundingSignature) {
        throw new Error('Failed to submit funding transaction');
      }

      // Add a delay to ensure funds are available on the server
      setCurrentStep('Waiting for funds to be available on the server...');
      
      // Poll the server to check if funds are available
      let fundingConfirmed = false;
      let retryCount = 0;
      const maxRetries = 10;
      
      while (!fundingConfirmed && retryCount < maxRetries) {
        const checkFundingResponse = await fetch('/api/check-funding-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serverSecretKey: fundingResult.serverSecretKey,
            fundingSignature: fundingSignature
          }),
        });
        
        const checkResult = await checkFundingResponse.json();
        
        if (checkResult.success && checkResult.funded) {
          fundingConfirmed = true;
          console.log('Server wallet funding confirmed');
        } else {
          retryCount++;
          console.log(`Waiting for funding confirmation... (${retryCount}/${maxRetries})`);
          // Wait 2 seconds before checking again
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!fundingConfirmed) {
        throw new Error('Timed out waiting for server wallet funding confirmation');
      }

      // Step 2: Upload metadata to Irys using server wallet
      setCurrentStep('Uploading metadata...');
      const uploadResponse = await fetch('/api/mint-companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          companionData: companion,
          serverSecretKey: fundingResult.serverSecretKey,
          fundingSignature: fundingSignature
        }),
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload metadata');
      }
      
      // Skip the metadata confirmation step and proceed directly to minting
      setCurrentStep('Minting your companion NFT...');

      // Import the mintCompanionNFT function
      const { mintCompanionNFT } = await import('../utils/mintUtils');

      console.log('Minting NFT...');
      const fixedMetadataUri = uploadResult.metadataUri.replace('https://arweave.net/', 'https://devnet.irys.xyz/'); 
  
      // Mint the NFT directly from the client
      const mintResult = await mintCompanionNFT(
        connection,
        publicKey,
        fixedMetadataUri, //uploadResult.metadataUri,
        signTransaction,
        async (message: Uint8Array) => {
          if (!wallet.signMessage) {
            throw new Error('Wallet does not support message signing');
          }
          return wallet.signMessage(message);
        }
      );
      
      if (!mintResult.success) {
        throw new Error(mintResult.message || 'Failed to mint NFT');
      }
      
      // Step 4: Verify the transaction
      setCurrentStep('Verifying transaction...');
      const verifyResponse = await fetch('/api/mint-companion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: mintResult.signature,
          assetAddress: mintResult.mint
        }),
      });
      
      const verifyResult = await verifyResponse.json();
      
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'Failed to verify transaction');
      }
      
      // Save the companion data
      setCurrentStep('Finalizing...');
      const saveResponse = await fetch('/api/save-companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          companion,
          mintAddress: mintResult.mint,
          metadataUri: uploadResult.metadataUri,
          signature: mintResult.signature
        }),
      });
      
      const saveResult = await saveResponse.json();
      
      // Generate Solana Explorer links
      const isDevnet = true; //process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
      const explorerBaseUrl = isDevnet 
        ? 'https://explorer.solana.com/?cluster=devnet' 
        : 'https://explorer.solana.com';
      
      const tokenUrl = `${explorerBaseUrl}/address/${mintResult.mint}`;

      console.log('Solana Explorer Token URL:', tokenUrl);
      
      if (saveResult.success) {
        setSuccess(`Your companion ${name} has been minted successfully! <a href="${tokenUrl}" target="_blank" class="text-blue-600 underline">View on Solana Explorer</a>`);
      } else {
        setError('Companion was minted but there was an issue finalizing. Please try refreshing.');
      }
    } catch (err) {
      setError(`Failed to mint companion: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 w-full max-w-7xl">
      <h2 className="text-3xl font-bold mb-6 text-center text-[#222]">Mint Your Solana Companion</h2>
      
      <div className="mb-8">
        <p className="text-lg text-[#444] text-center">
          You don't have a Solana Companion yet. Create your own digital friend that will grow with you on your blockchain journey!
        </p>
      </div>
      
      <div className="mb-8">
        <label htmlFor="name" className="block text-lg font-medium text-[#333] mb-2">
          Name Your Companion
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name for your companion"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff6f61] focus:border-transparent text-[#333]"
          maxLength={20}
        />
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-medium text-[#333] mb-4">Choose Your Companion</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {companionChoices.map((companion) => (
            <div
              key={companion.id}
              className={`bg-white rounded-xl p-6 border-2 transition-all duration-300 cursor-pointer hover:shadow-md ${
                selectedCompanion?.id === companion.id
                  ? 'border-[#ff6f61] shadow-md'
                  : 'border-gray-200'
              }`}
              onClick={() => setSelectedCompanion(companion)}
            >
              <div className="flex flex-col items-center">
                <Image
                  src={companion.image}
                  alt={companion.name}
                  width={120}
                  height={120}
                  className="mb-4"
                />
                <h4 className="text-xl font-bold text-[#333] mb-2">{companion.name}</h4>
                <p className="text-sm text-[#666] text-center">{companion.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <div dangerouslySetInnerHTML={{ __html: success }} />
        </div>
      )}
      
      {currentStep && (
        <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-3"></div>
          {currentStep}
        </div>
      )}
      
      <div className="flex justify-center">
        <button
          onClick={handleMint}
          disabled={isLoading || !name.trim() || !selectedCompanion || !publicKey || !signTransaction}
          className={`bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium text-lg py-3 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105 ${
            (isLoading || !name.trim() || !selectedCompanion || !publicKey || !signTransaction)
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        >
          {isLoading ? 'Processing...' : 'Mint Your Companion'}
        </button>
      </div>
      
      <div className="mt-6 text-sm text-[#666] text-center">
        <p>Note: Minting requires SOL for transaction fees and storage costs.</p>
      </div>
    </div>
  );
}; 