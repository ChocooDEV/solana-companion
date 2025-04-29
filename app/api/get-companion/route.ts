import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchAssetsByCollection } from '@metaplex-foundation/mpl-core';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    const umi = createUmi('https://api.devnet.solana.com'); ///*process.env.RPC_API_URL || */

    const collection = publicKey(process.env.COLLECTION_ADDRESS || '6GfRWbTgpMJB51hXzp5CuDVGwVTFhAFCJvxqQEswe2bY')

    const assetsByCollection = await fetchAssetsByCollection(umi, collection, {
      skipDerivePlugins: false,
    });

    console.log(assetsByCollection)

  } catch (error) {
    console.error('Error fetching companion:', error);
    return NextResponse.json({ error: 'Failed to fetch companion' }, { status: 500 });
  }
}
