import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey, signerIdentity } from '@metaplex-foundation/umi';
import { fetchAsset, update } from '@metaplex-foundation/mpl-core';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import bs58 from 'bs58';
import { createSignerFromKeypair } from '@metaplex-foundation/umi';

// Define interfaces for the metadata structure
interface MetadataAttribute {
  trait_type: string;
  value: string;
}

interface CompanionMetadata {
  attributes?: MetadataAttribute[];
  [key: string]: unknown;
}

// This endpoint should be protected and only called by a scheduled job
export async function POST(request: NextRequest) {
  // Check for authorization - in a real app, use a secure method
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get list of companions to check
    // In a real app, you would fetch this from a database
    // For this example, we'll use a mock list
    const { companions } = await request.json();
    
    if (!companions || !Array.isArray(companions)) {
      return NextResponse.json({ error: 'Invalid companions list' }, { status: 400 });
    }
    
    // Create UMI instance with server wallet
    const umi = createUmi(process.env.RPC_API_URL || 'https://api.devnet.solana.com');
    
    // Add Irys uploader to UMI
    umi.use(irysUploader());
    
    // Create a keypair from the private key in .env
    const privateKeyString = process.env.PRIVATE_KEY || '';
    const secretKey = bs58.decode(privateKeyString);
    const serverWallet = umi.eddsa.createKeypairFromSecretKey(secretKey);
    
    // Create a proper UMI signer from the keypair
    const serverSigner = createSignerFromKeypair(umi, serverWallet);
    
    // Use the signer with UMI
    umi.use(signerIdentity(serverSigner));
    
    const results = [];
    
    // Process each companion
    for (const companion of companions) {
      try {
        // Fetch the asset
        const asset = await fetchAsset(umi, publicKey(companion.assetAddress));
        
        // Get existing metadata
        let metadata: CompanionMetadata = {};
        if (asset.uri) {
          const response = await fetch(asset.uri);
          metadata = await response.json();
        }
        
        // Check last update time
        const lastUpdatedAttr = metadata.attributes?.find((attr) => attr.trait_type === "LastUpdated");
        const lastUpdated = lastUpdatedAttr ? new Date(lastUpdatedAttr.value) : null;
        
        // If no last update or last update was more than 3 days ago, make companion sad
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        if (!lastUpdated || lastUpdated < threeDaysAgo) {
          // Update mood to sad
          const updatedMetadata = {
            ...metadata,
            attributes: [
              ...(metadata.attributes || []).filter((attr) => attr.trait_type !== "Mood"),
              { trait_type: "Mood", value: "Sad" }
            ]
          };
          
          // Upload updated metadata to Irys
          const metadataUri = await umi.uploader.uploadJson(updatedMetadata);
          
          // Build and send the transaction for updating the asset
          const transaction = await update(umi, {
            asset: asset,
            uri: metadataUri,
          }).sendAndConfirm(umi);
          
          results.push({
            assetAddress: companion.assetAddress,
            status: 'updated',
            newMood: 'Sad',
            signature: transaction.signature.toString()
          });
        } else {
          results.push({
            assetAddress: companion.assetAddress,
            status: 'skipped',
            reason: 'Recently updated'
          });
        }
      } catch (error) {
        console.error(`Error updating companion ${companion.assetAddress}:`, error);
        results.push({
          assetAddress: companion.assetAddress,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error updating inactive companions:', error);
    return NextResponse.json({ error: 'Failed to update inactive companions' }, { status: 500 });
  }
} 