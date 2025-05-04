import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';
import { getRpcUrl } from '@/app/utils/solanaConnection';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('walletAddress') || searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    // Create UMI instance using the utility function
    const rpcUrl = await getRpcUrl();
    const umi = createUmi(rpcUrl);
    const collectionAddress = process.env.COLLECTION_ADDRESS || '6WyrLJPgJgk3DU9gWUjPWGcKfQ2BhdpnQ3p6jLoi12Sh';
    
    // Fetch all assets owned by the wallet
    const assets = await fetchAssetsByOwner(umi, publicKey(walletAddress));
    
    // Find all assets that belong to our collection
    const companionAssets = assets.filter(asset => {
      // Check if the asset has an updateAuthority of type Collection
      if (asset.updateAuthority?.type === 'Collection') {
        // Compare the collection address with our target collection
        return asset.updateAuthority.address === collectionAddress;
      }
      return false;
    });

    const hasCompanion = companionAssets.length > 0;
    const companionCount = companionAssets.length;

    return NextResponse.json({ hasCompanion, companionCount });
  } catch (error) {
    console.error('Error checking companion ownership:', error);
    return NextResponse.json(
      { error: 'Failed to check companion ownership' },
      { status: 500 }
    );
  }
} 