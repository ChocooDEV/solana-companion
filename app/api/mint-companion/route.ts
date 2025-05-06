import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { signerIdentity } from '@metaplex-foundation/umi';
import Irys from '@irys/sdk';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { getRpcUrl } from '../../utils/solanaConnection';
import bs58 from 'bs58';
import { Transaction as UmiTransaction } from '@metaplex-foundation/umi';

// Helper function to get RPC URL from the /env route
async function fetchRpcUrl() {
  const baseUrl = /*process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.NEXT_PUBLIC_BASE_URL ||*/ 'http://localhost:3000';

  try {
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

// Step 1: Get funding transaction
export async function GET(request: NextRequest) {
  try {
    const { walletAddress } = Object.fromEntries(request.nextUrl.searchParams);
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    // Get RPC URL from the /env route
    const rpcUrl = await fetchRpcUrl();
    
    // Determine if we're using devnet or mainnet
    const isDevnet = rpcUrl.includes('devnet') || process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
    const irysUrl = isDevnet ? "https://devnet.irys.xyz" : "https://node1.irys.xyz";
    
    // Use server wallet from .env instead of generating a new one
    const umi = createUmi(rpcUrl);
    
    // Create a keypair from the private key in .env
    const privateKeyString = process.env.PRIVATE_KEY || '';
    const secretKey = bs58.decode(privateKeyString);
    const serverWallet = umi.eddsa.createKeypairFromSecretKey(secretKey);
    
    // Create a Solana keypair for Irys
    const keypair = serverWallet;
    
    // Calculate Irys funding amount
    const irys = new Irys({
      url: irysUrl,
      token: "solana",
      key: keypair.secretKey,
      config: { providerUrl: rpcUrl }
    });
    
    const estimatedSize = 5000; // 5KB for metadata
    const price = await irys.getPrice(estimatedSize);
    const priceInSol = irys.utils.fromAtomic(price);
    
    // Add extra SOL for rent exemption (0.01 SOL should be enough for most cases)
    const atomicAmount = BigInt(price.toString()) + BigInt(10000000); // Add 0.01 SOL
    
    // Create a proper Solana transaction
    const connection = new Connection(rpcUrl, 'confirmed');
    const transaction = new Transaction();
    
    // Add a system transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(walletAddress),
        toPubkey: new PublicKey(serverWallet.publicKey),
        lamports: Number(atomicAmount)
      })
    );
    
    // Get a recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(walletAddress);
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    return NextResponse.json({
      success: true,
      serverWallet: serverWallet.publicKey.toString(),
      serverSecretKey: Array.from(serverWallet.secretKey),
      fundingTransaction: serializedTransaction,
      estimatedCost: priceInSol
    });
  } catch (error) {
    console.error('Error creating funding transaction:', error);
    return NextResponse.json({ error: 'Failed to create funding transaction' }, { status: 500 });
  }
}

// Step 2: Upload metadata after funding
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, companionData, fundingSignature } = await request.json();
    
    if (!walletAddress || !companionData || !fundingSignature) {
      return NextResponse.json({ 
        error: 'Wallet address, companion data, and funding signature are required' 
      }, { status: 400 });
    }
    
    // Get RPC URL from the /env route
    const rpcUrl = await fetchRpcUrl();
    
    // Determine if we're using devnet or mainnet
    const isDevnet = rpcUrl.includes('devnet');
    const irysUrl = isDevnet ? "https://devnet.irys.xyz" : "https://node1.irys.xyz";
    
    // Use server wallet from .env
    const umi = createUmi(rpcUrl);
    
    // Create a keypair from the private key in .env
    const privateKeyString = process.env.PRIVATE_KEY || '';
    const secretKey = bs58.decode(privateKeyString);
    const serverWallet = umi.eddsa.createKeypairFromSecretKey(secretKey);
    
    // Create a proper UMI signer from the keypair
    const serverSigner = {
      publicKey: serverWallet.publicKey,
      secretKey: serverWallet.secretKey,
      signMessage: async (message: Uint8Array) => {
        return umi.eddsa.sign(message, serverWallet);
      },
      signTransaction: async (transaction: unknown) => transaction as UmiTransaction,
      signAllTransactions: async (transactions: unknown[]) => transactions as UmiTransaction[],
    };
    
    // Use the signer with UMI
    umi.use(signerIdentity(serverSigner));
    
    // Log the server wallet address
    console.log('Server wallet address:', serverWallet.publicKey);
    
    // Check server wallet balance
    const connection = new Connection(rpcUrl, 'confirmed');
    const serverBalance = await connection.getBalance(new PublicKey(serverWallet.publicKey));
    console.log('Server wallet balance:', serverBalance / 1e9, 'SOL');
    
    // Verify funding transaction
    const status = await connection.getSignatureStatus(fundingSignature);
    console.log('Funding transaction status:', status?.value?.confirmationStatus);
    
    if (!status || !status.value || status.value.confirmationStatus !== 'confirmed') {
      return NextResponse.json({ error: 'Funding transaction not confirmed' }, { status: 400 });
    }
    
    // Check server wallet balance and ensure funds are available
    const serverBalanceAfterFunding = await connection.getBalance(new PublicKey(serverWallet.publicKey));
    console.log('Server wallet balance after funding:', serverBalanceAfterFunding / 1e9, 'SOL');
    
    // Ensure the wallet has sufficient funds before proceeding
    if (serverBalanceAfterFunding <= 0) {
      // Wait a bit and check again (retry mechanism)
      console.log('Waiting for funds to be available...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const retryBalance = await connection.getBalance(new PublicKey(serverWallet.publicKey));
      console.log('Server wallet balance after waiting:', retryBalance / 1e9, 'SOL');
      
      if (retryBalance <= 0) {
        return NextResponse.json({ 
          error: 'Funding transaction confirmed but funds not available in server wallet',
          serverWallet: serverWallet.publicKey,
          fundingStatus: status?.value
        }, { status: 400 });
      }
    }
    
    // Add Irys uploader to UMI
    umi.use(irysUploader({
      address: irysUrl,
      payer: serverSigner,
    }));
    
    // Upload metadata to Irys (server-side with funded wallet)
    const metadata = {
      name: companionData.name,
      description: companionData.description,
      image: companionData.image,
      attributes: [
        { trait_type: "Experience", value: companionData.experience.toString() },
        { trait_type: "Level", value: companionData.level.toString() },
        { trait_type: "Evolution", value: companionData.evolution.toString() },
        { trait_type: "Mood", value: companionData.mood },
        { trait_type: "DateOfBirth", value: companionData.dateOfBirth },
        { trait_type: "LastUpdated", value: new Date().toISOString() },
        { trait_type: "XpForNextLevel", value: companionData.xpForNextLevel?.toString() || "100" },
        ...companionData.attributes
      ]
    };

    try {
      console.log('Attempting to upload metadata with server wallet:', serverWallet.publicKey);
      
      // Create an Irys instance directly instead of using umi.uploader
      const irys = new Irys({
        url: irysUrl,
        token: "solana",
        key: serverWallet.secretKey,
        config: { providerUrl: rpcUrl }
      });
      
      // Upload metadata using Irys directly
      const uploadResponse = await irys.upload(JSON.stringify(metadata), {
        tags: [{ name: "Content-Type", value: "application/json" }]
      });
      
      console.log('Metadata uploaded successfully to:', uploadResponse.id);
      
      // Use the correct URL based on environment (devnet vs mainnet)
      const metadataUri = isDevnet 
        ? `https://devnet.irys.xyz/${uploadResponse.id}`
        : `https://arweave.net/${uploadResponse.id}`;
      
      // Return the metadata URI for the client to use for minting
      return NextResponse.json({ 
        success: true, 
        metadataUri: metadataUri,
        // No minting happens here - just return the metadata URI
      });
      
    } catch (uploadError) {
      console.error('Error during upload:', uploadError);
      
      // Check balance again to see if it changed
      const serverBalanceAfterError = await connection.getBalance(new PublicKey(serverWallet.publicKey));
      console.log('Server wallet balance after error:', serverBalanceAfterError / 1e9, 'SOL');
      
      return NextResponse.json({ 
        success: false,
        error: `Failed during upload: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`,
        walletUsed: serverWallet.publicKey,
        walletBalance: serverBalanceAfterFunding / 1e9
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error preparing upload:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to prepare upload: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

// New endpoint for client-side minting
export async function PATCH(request: NextRequest) {
  try {
    const { walletAddress, metadataUri, name } = await request.json();
    
    if (!walletAddress || !metadataUri || !name) {
      return NextResponse.json({ 
        error: 'Wallet address, metadata URI, and name are required' 
      }, { status: 400 });
    }
    
    
    // Return instructions for client-side minting
    return NextResponse.json({
      success: true,
      metadataUri,
      instructions: {
        message: "The client should mint the NFT directly using the provided metadata URI",
        walletToUse: walletAddress,
        metadataUri: metadataUri,
        name: name
      }
    });
    
  } catch (error) {
    console.error('Error preparing mint instructions:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to prepare mint instructions: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

// Endpoint to verify the transaction was successful
export async function PUT(request: NextRequest) {
  try {
    const { signature, assetAddress } = await request.json();
    
    if (!signature || !assetAddress) {
      return NextResponse.json({ error: 'Transaction signature and asset address are required' }, { status: 400 });
    }
    
    // Get RPC URL from the /env route
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