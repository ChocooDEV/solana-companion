import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchAssetsByOwner, deserializeCollectionV1 } from '@metaplex-foundation/mpl-core';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    // Create UMI instance
    const umi = createUmi('https://api.devnet.solana.com'); ///*process.env.RPC_API_URL || */
    
    // Get the collection address from environment variables or use default
    const collectionAddress = process.env.COLLECTION_ADDRESS || '6GfRWbTgpMJB51hXzp5CuDVGwVTFhAFCJvxqQEswe2bY';
    
    console.log(walletAddress)
    // Fetch all assets owned by the wallet
    const assets = await fetchAssetsByOwner(umi, publicKey(walletAddress));

    console.log(assets)
   /* // Check if any asset belongs to our collection
    const hasCompanion = assets.some(asset => {
      const collectionPlugin = deserializeCollectionV1(asset);
      if (!collectionPlugin) {
        return false;
      }
      return collectionPlugin.collection?.key.toString() === collectionAddress;
    });
*/

    // Return false for debugging purposes instead of the assets
    return NextResponse.json({ hasCompanion: false });
  } catch (error) {
    console.error('Error checking companion ownership:', error);
    return NextResponse.json(
      { error: 'Failed to check companion ownership' },
      { status: 500 }
    );
  }
} 