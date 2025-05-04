'use client';

import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { CompanionChoice } from '../types/companion';
import { Transaction } from '@solana/web3.js';

const companionChoices: CompanionChoice[] = [
  {
    id: 1,
    name: "Fluffy",
    image: "https://i.imgur.com/9rmNc1F.png",
    description: "A plush-like companion covered in soft, abundant fur. Radiates coziness and turns every moment into a warm, comforting adventure"
  },
  {
    id: 2,  
    name: "Sparky",
    image: "/companions/sparky_0.png",
    description: "An electrifying companion that crackles with energy. Brightens any space with vibrant personality and makes every adventure more exciting"
  },
  {
    id: 3,
    name: "Ember",
    image: "/companions/ember_0.png",
    description: "A blazing companion with a fiery spirit. Radiates warmth and energy, turning everyday moments into unforgettable adventures"
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
  const [gameConfig, setGameConfig] = useState<{
    levelThresholds: number[];
    evolutionThresholds: number[];
  } | null>(null);

  // Fetch game configuration on component mount
  useEffect(() => {
    const fetchGameConfig = async () => {
      try {
        const response = await fetch('/api/game-config');
        if (!response.ok) {
          throw new Error('Failed to load game configuration');
        }
        const configData = await response.json();
        setGameConfig(configData);
      } catch (err) {
        console.error('Error fetching game config:', err);
        // Don't set error state here to avoid showing error to user
        // Just log it and use default values if needed
      }
    };
    
    fetchGameConfig();
  }, []);

  // Calculate XP needed for next level
  const getXpForNextLevel = (currentLevel: number, currentExp: number) => {
    if (!gameConfig || currentLevel >= gameConfig.levelThresholds.length - 1) {
      return 100; // Default to 100 if config not loaded or max level reached
    }
    
    return gameConfig.levelThresholds[currentLevel + 1] - currentExp;
  };

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
      // Initial level and experience
      const initialLevel = 0;
      const initialExperience = 0;
      
      // Create companion data
      const companion = {
        name: name.trim(),
        dateOfBirth: new Date().toISOString(),
        image: selectedCompanion.image,
        description: selectedCompanion.description,
        experience: initialExperience,
        level: initialLevel,
        evolution: 0,
        mood: "Happy",
        xpForNextLevel: getXpForNextLevel(initialLevel, initialExperience),
        attributes: [
          { trait_type: "Toys", value: "None" },
          { trait_type: "Background", value: "None" }
        ]
      };

      // Get funding transaction
      setCurrentStep('Getting funding transaction...');
      const initResponse = await fetch(`/api/mint-companion?walletAddress=${publicKey.toString()}`);
      
      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        throw new Error(`Failed to get funding transaction: ${errorText}`);
      }
      
      const initResult = await initResponse.json();
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to get funding transaction');
      }
      
      // Sign the funding transaction
      setCurrentStep('Signing funding transaction...');
      const fundingTxBuffer = Buffer.from(initResult.fundingTransaction, 'base64');
      const fundingTx = Transaction.from(fundingTxBuffer);
      const signedFundingTx = await signTransaction(fundingTx);
      
      // Submit the funding transaction
      setCurrentStep('Submitting funding transaction...');
      const { getSolanaConnection } = await import('../utils/solanaConnection');
      const connection = await getSolanaConnection('confirmed');
      
      const fundingSignature = await connection.sendRawTransaction(
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
      
      // Upload metadata
      setCurrentStep('Uploading metadata...');
      const uploadResponse = await fetch('/api/mint-companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          companionData: companion,
          fundingSignature: fundingSignature
        }),
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to upload metadata: ${errorText}`);
      }
      
      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload metadata');
      }
      
      // Get minting instructions
      setCurrentStep('Preparing to mint NFT...');
      const mintInstructionsResponse = await fetch('/api/mint-companion', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          metadataUri: uploadResult.metadataUri,
          name: companion.name
        }),
      });
      
      if (!mintInstructionsResponse.ok) {
        const errorText = await mintInstructionsResponse.text();
        throw new Error(`Failed to get minting instructions: ${errorText}`);
      }
      
      const mintInstructions = await mintInstructionsResponse.json();
      
      if (!mintInstructions.success) {
        throw new Error(mintInstructions.error || 'Failed to get minting instructions');
      }
      
      // Mint the NFT client-side
      setCurrentStep('Minting your companion NFT...');
      const { mintCompanionNFT } = await import('../utils/mintUtils');
      
      const mintResult = await mintCompanionNFT(
        connection,
        publicKey,
        mintInstructions.metadataUri,
        signTransaction,
        wallet.signMessage || (() => Promise.reject("Wallet doesn't support message signing"))
      );
      
      if (!mintResult.success) {
        throw new Error(mintResult.message || 'Failed to mint NFT');
      }
      
      // Verify the transaction
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
      
      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.warn(`Verification warning: ${errorText}`);
        // Continue even if verification has issues
      }
      
      // Generate Solana Explorer links
      const isDevnet = true;
      const explorerBaseUrl = isDevnet 
        ? 'https://explorer.solana.com/?cluster=devnet' 
        : 'https://explorer.solana.com';
      
      const tokenUrl = `${explorerBaseUrl}/address/${mintResult.mint}`;
      
      setSuccess(`Your companion ${name} has been minted successfully! <a href="${tokenUrl}" target="_blank" class="text-blue-600 underline">View on Solana Explorer</a>`);
      
      // Add a delay before reloading the page
      setTimeout(() => {
        window.location.reload();
      }, 5000); // Reload after 5 seconds
      
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
          You don&apos;t have a Solana Companion yet. Create your own digital friend that will grow with you on your blockchain journey!
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