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
import { getRpcUrl } from '@/app/utils/solanaConnection';
import { Connection, Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import Irys from '@irys/sdk';

// GET endpoint to prepare funding transaction
export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }
    
    // Get RPC URL
    const rpcUrl = await getRpcUrl();
    console.log('RPC URL:', rpcUrl);
    // Create UMI instance
    const umi = createUmi(rpcUrl);
    
    // Create a keypair from the private key in .env
    const privateKeyString = process.env.PRIVATE_KEY || '';
    const secretKey = bs58.decode(privateKeyString);
    const serverWallet = umi.eddsa.createKeypairFromSecretKey(secretKey);
    
    // Calculate Irys funding amount
    const irys = new Irys({
      url: "https://devnet.irys.xyz",
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
    const rpcUrl = await getRpcUrl();
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
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to verify funding transaction' 
      }, { status: 400 });
    }
    
    // Add Irys uploader to UMI
    umi.use(irysUploader({
      address: "https://devnet.irys.xyz",
      payer: serverSigner,
    }));
    
    // 2. Upload metadata to Irys (server-side with server wallet)
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
        ...companionData.attributes
      ]
    };
    
    console.log('Uploading metadata with server wallet:', serverWallet.publicKey);
    const metadataUri = await umi.uploader.uploadJson(metadata);
    console.log('Metadata uploaded successfully to:', metadataUri);
    
    // 3. Fetch the asset
    const asset = await fetchAsset(umi, publicKey(assetAddress));

    // 4. Fetch the collection using the collection address from environment variables
    let collection = undefined;
    const collectionAddress = process.env.COLLECTION_ADDRESS;
    if (collectionAddress) {
      try {
        collection = await fetchCollection(umi, publicKey(collectionAddress));
        console.log('Collection fetched:', collection);
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
    
    // Use the utility function to get RPC URL
    const rpcUrl = await getRpcUrl();
    
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