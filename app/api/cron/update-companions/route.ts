import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { fetchAssetsByCollection } from '@metaplex-foundation/mpl-core';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { getSolanaConnection, getRpcUrl } from '@/app/utils/solanaConnection';

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron job from Vercel
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Connect to Solana using the utility function
    const connection = await getSolanaConnection('confirmed');
    
    // Get the collection address
    const collectionAddress = process.env.COLLECTION_ADDRESS || '6WyrLJPgJgk3DU9gWUjPWGcKfQ2BhdpnQ3p6jLoi12Sh';
    
    // Create UMI instance using the utility function
    const rpcUrl = await getRpcUrl();
    const umi = createUmi(rpcUrl);

    // Fetch all assets in the collection
    const assets = await fetchAssetsByCollection(umi, publicKey(collectionAddress));

    // Map assets to the format needed for update-inactive-companions
    const companions = assets.map(asset => ({
      assetAddress: asset.publicKey.toString()
    }));
    
    // Call our update-inactive-companions endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/update-inactive-companions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET_KEY}`
      },
      body: JSON.stringify({ companions })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update inactive companions');
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Companion update job completed',
      results: data.results
    });
  } catch (error) {
    console.error('Error running companion update job:', error);
    return NextResponse.json({ error: 'Failed to run companion update job' }, { status: 500 });
  }
} 