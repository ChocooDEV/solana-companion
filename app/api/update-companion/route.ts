import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  fetchAsset, 
  update,
  fetchCollection
} from '@metaplex-foundation/mpl-core';
import { 
  publicKey,
  transactionBuilder,
  signerIdentity,
  createSignerFromKeypair
} from '@metaplex-foundation/umi';
import { Connection, Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import Irys from '@irys/sdk';

// Helper function to get RPC URL from the /env route
async function fetchRpcUrl() {
  try {
    const baseUrl = /*process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL ||*/ 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/env?key=RPC_API_URL`);
    if (!response.ok) {
      throw new Error(`Failed to fetch RPC URL: ${response.statusText}`);
    }
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error fetching RPC URL:', error);
    // Fallback to default or environment variable if fetch fails
    return process.env.RPC_API_URL || 'https://api.devnet.solana.com';
  }
}

// GET endpoint to prepare funding transaction
export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    // Get RPC URL from the /env route
    const rpcUrl = await fetchRpcUrl();
    console.log('RPC URL:', rpcUrl);
    
    // Determine if we're using devnet or mainnet
    const isDevnet = rpcUrl.includes('devnet') || process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
    const irysUrl = isDevnet ? "https://devnet.irys.xyz" : "https://node1.irys.xyz";
    
    // Create UMI instance
    const umi = createUmi(rpcUrl);
    
    // Create a keypair from the private key in .env
    const privateKeyString = process.env.PRIVATE_KEY || '';
    const secretKey = bs58.decode(privateKeyString);
    const serverWallet = umi.eddsa.createKeypairFromSecretKey(secretKey);
    
    // Calculate Irys funding amount
    const irys = new Irys({
      url: irysUrl,
      token: "solana",
      key: serverWallet.secretKey,
      config: { providerUrl: rpcUrl }
    });
    
    const estimatedSize = 5000; // 5KB for metadata
    const price = await irys.getPrice(estimatedSize);
    
    // Add extra SOL for rent exemption (0.01 SOL should be enough for most cases)
    const atomicAmount = BigInt(price.toString()) + BigInt(10000000); // Add 0.01 SOL
    
    // Create a proper Solana transaction
    const connection = new Connection(rpcUrl, 'confirmed');
    const transaction = new Transaction();
    
    // Add instruction to transfer SOL from client to server wallet
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(walletAddress),
        toPubkey: new PublicKey(serverWallet.publicKey),
        lamports: Number(atomicAmount)
      })
    );
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(walletAddress);
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    
    const base64Transaction = serializedTransaction.toString('base64');
    
    return NextResponse.json({
      success: true,
      fundingTransaction: base64Transaction,
      estimatedCost: atomicAmount.toString(),
      serverSecretKey: bs58.encode(serverWallet.secretKey)
    });
  } catch (error) {
    console.error('Error preparing funding transaction:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// POST endpoint to handle metadata upload and transaction preparation
export async function POST(request: NextRequest) {
  try {
    const { assetAddress, companionData, payerPublicKey, serverSecretKey, fundingSignature } = await request.json();
    
    console.log('Received update request:', { assetAddress, companionData, payerPublicKey });
    if (!assetAddress || !companionData || !payerPublicKey || !serverSecretKey || !fundingSignature) {
      return NextResponse.json({ 
        error: 'assetAddress, companionData, payerPublicKey, serverSecretKey, and fundingSignature are required' 
      }, { status: 400 });
    }
    
    // 1. Setup UMI with backend wallet as update authority
    const rpcUrl = await fetchRpcUrl();
    
    // Determine if we're using devnet or mainnet
    const isDevnet = rpcUrl.includes('devnet') || process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
    const irysUrl = isDevnet ? "https://devnet.irys.xyz" : "https://node1.irys.xyz";
    
    const umi = createUmi(rpcUrl);

    // Recreate server wallet from the provided secret key
    const secretKey = bs58.decode(serverSecretKey);
    const serverWallet = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const serverSigner = createSignerFromKeypair(umi, serverWallet);
    umi.use(signerIdentity(serverSigner));
    
    // Verify the funding transaction
    const connection = new Connection(rpcUrl, 'confirmed');
    try {
      const status = await connection.getSignatureStatus(fundingSignature);
      if (!status || !status.value || status.value.err) {
        return NextResponse.json({ 
          success: false, 
          error: 'Funding transaction failed or not confirmed' 
        }, { status: 400 });
      }
    } catch (error) {
      console.error('Error verifying funding transaction:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to verify funding transaction' 
      }, { status: 400 });
    }
    
    // Add Irys uploader to UMI
    umi.use(irysUploader({
      address: irysUrl,
      payer: serverSigner,
    }));
    
    // Fetch game configuration to calculate XP for next level
    let gameConfig;
    try {
      // Create a simple fetch function that works in Node.js environment
      const fetch = (await import('node-fetch')).default;
      const baseUrl = /*process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NEXT_PUBLIC_BASE_URL ||*/ 'http://localhost:3000';
      
      const configResponse = await fetch(`${baseUrl}/api/game-config`);
      if (!configResponse.ok) {
        throw new Error('Failed to fetch game configuration');
      }
      gameConfig = await configResponse.json();
    } catch (error) {
      console.error('Error fetching game config:', error);
      // Continue with default values if config fetch fails
      gameConfig = {
        levelThresholds: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300],
        evolutionThresholds: [0, 3, 6]
      };
    }
    
    // Get the correct image URL based on companion type and evolution
    let imageUrl = companionData.image;
    
    // Extract companion type from the image URL
    const companionType = getCompanionTypeFromDescription(companionData.description);
    
    if (companionType && gameConfig && gameConfig.companionImages && gameConfig.companionImages[companionType]) {
      // Get the correct image based on evolution
      const evolutionIndex = Math.min(
        companionData.evolution, 
        gameConfig.companionImages[companionType].length - 1
      );
      imageUrl = gameConfig.companionImages[companionType][evolutionIndex];
    }
    
    // Helper function to determine companion type from description
    function getCompanionTypeFromDescription(description: string): string | null {
      if (description.toLowerCase().includes('sparky') || description.toLowerCase().includes('electrifying')) {
        return 'sparky';
      } else if (companionData.description.toLowerCase().includes('fluffy')) {
        return 'fluffy';
      } else if (companionData.description.toLowerCase().includes('ember')) {
        return 'ember';
      }
      return 'fluffy';
    }
    
    // Calculate XP needed for next level
    const getXpForNextLevel = (currentLevel: number, currentExp: number) => {
      if (!gameConfig || currentLevel >= gameConfig.levelThresholds.length - 1) {
        return 100; // Default to 100 if config not loaded or max level reached
      }
      
      return gameConfig.levelThresholds[currentLevel + 1] - currentExp;
    };
    
    // Calculate XP for next level
    const xpForNextLevel = getXpForNextLevel(companionData.level, companionData.experience);
    
    // 2. Upload metadata to Irys (server-side with server wallet)
    const metadata = {
      name: companionData.name,
      description: companionData.description,
      image: imageUrl, // Use the updated image URL based on evolution
      attributes: [
        { trait_type: "Experience", value: companionData.experience.toString() },
        { trait_type: "Level", value: companionData.level.toString() },
        { trait_type: "Evolution", value: companionData.evolution.toString() },
        { trait_type: "Mood", value: companionData.mood },
        { trait_type: "DateOfBirth", value: companionData.dateOfBirth },
        { trait_type: "LastUpdated", value: new Date().toISOString() },
        { trait_type: "XpForNextLevel", value: xpForNextLevel.toString() },
        ...companionData.attributes.filter((attr: { trait_type: string }) => 
          !["Experience", "Level", "Evolution", "Mood", "DateOfBirth", "LastUpdated", "XpForNextLevel"].includes(attr.trait_type)
        )
      ]
    };
   
    // Try a simpler approach to upload JSON
    let metadataUri;
    try {
      // First attempt with UMI uploader
      metadataUri = await umi.uploader.uploadJson(metadata);
    } catch (uploadError) {
      console.log('UMI uploader failed, falling back to direct Irys upload:', uploadError);
      
      // Fallback to direct Irys upload if UMI uploader fails
      const irys = new Irys({
        url: irysUrl,
        token: "solana",
        key: serverWallet.secretKey,
        config: { providerUrl: rpcUrl }
      });
      
      const metadataBuffer = Buffer.from(JSON.stringify(metadata));
      const uploadResponse = await irys.upload(metadataBuffer, {
        tags: [{ name: "Content-Type", value: "application/json" }]
      });
      
      console.log('Upload response id:', uploadResponse.id);
      // Use the correct URL based on environment (devnet vs mainnet)
      metadataUri = isDevnet 
        ? `https://devnet.irys.xyz/${uploadResponse.id}`
        : `https://arweave.net/${uploadResponse.id}`;
    }
    
    console.log('Metadata uploaded successfully to:', metadataUri);
    
    // 3. Fetch the asset
    const asset = await fetchAsset(umi, publicKey(assetAddress));

    // 4. Fetch the collection using the collection address from environment variables
    let collection = undefined;
    const collectionAddress = process.env.COLLECTION_ADDRESS;
    if (collectionAddress) {
      try {
        collection = await fetchCollection(umi, publicKey(collectionAddress));
      } catch (error) {
        console.error('Error fetching collection:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch collection data' 
        }, { status: 500 });
      }
    }
    
    // 5. Prepare the update transaction
    const latestBlockhash = await umi.rpc.getLatestBlockhash();
    const txBuilder = transactionBuilder().add(
      update(umi, {
        asset,
        name: companionData.name,
        uri: metadataUri,
        collection, // Include the collection data
      })
    ).setBlockhash(latestBlockhash.blockhash);
    
    // 6. Build the transaction (Umi will automatically sign as authority)
    const builtTx = txBuilder.build(umi);
    
    // 7. Serialize and return to client
    const serializedTx = umi.transactions.serialize(builtTx);
    const base64Tx = Buffer.from(serializedTx).toString('base64');
    
    console.log('Updating companion with:', {
      assetAddress: assetAddress,
      metadataUri: metadataUri,
      payerPublicKey: payerPublicKey,
    });
    
    return NextResponse.json({
      success: true,
      transaction: base64Tx,
      metadataUri: metadataUri
    });
  } catch (error) {
    console.error('Error preparing companion update:', error);
    return NextResponse.json({ error: 'Failed to prepare companion update' }, { status: 500 });
  }
}

// Endpoint to verify the transaction was successful
export async function PUT(request: NextRequest) {
  try {
    const { signature, assetAddress } = await request.json();
    
    if (!signature || !assetAddress) {
      return NextResponse.json({ error: 'Transaction signature and asset address are required' }, { status: 400 });
    }
    
    // Use the helper function to get RPC URL
    const rpcUrl = await fetchRpcUrl();
    
    // Create a Connection instance to check the transaction status
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Convert signature to the correct format if it's an array
    let signatureString = signature;
    if (Array.isArray(signature)) {
      // Convert byte array to base58 string
      const signatureBytes = new Uint8Array(signature);
      signatureString = bs58.encode(signatureBytes);
    } else if (typeof signature === 'string' && signature.includes(',')) {
      // Handle comma-separated string of numbers
      const signatureBytes = new Uint8Array(signature.split(',').map(Number));
      signatureString = bs58.encode(signatureBytes);
    }
    
    // Log the signature for debugging
    console.log('Original signature:', signature);
    console.log('Converted signature:', signatureString);
    
    try {
      // Verify the transaction was successful
      const status = await connection.getSignatureStatus(signatureString);
      
      if (!status || !status.value || status.value.confirmationStatus !== 'confirmed') {
        return NextResponse.json({ 
          success: false, 
          error: 'Transaction failed or not confirmed', 
          details: status
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: true, 
        assetAddress: assetAddress
      });
    } catch (signatureError) {
      console.error('Error checking signature:', signatureError);
      
      // Try to get transaction details as an alternative
      try {
        const transaction = await connection.getTransaction(signatureString, {
          maxSupportedTransactionVersion: 0
        });
        
        if (transaction && transaction.meta && !transaction.meta.err) {
          return NextResponse.json({ 
            success: true, 
            assetAddress: assetAddress,
            transactionDetails: 'Transaction found and appears successful'
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            error: 'Transaction verification failed', 
            details: transaction ? 'Transaction found but has errors' : 'Transaction not found'
          }, { status: 400 });
        }
      } catch (txError) {
        console.error('Error getting transaction:', txError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to verify transaction', 
          details: `${signatureError}, and failed to get transaction: ${txError}`
        }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return NextResponse.json({ 
      error: 'Failed to verify transaction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}