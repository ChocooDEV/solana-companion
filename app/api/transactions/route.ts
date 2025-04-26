import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

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
    // Validate the wallet address
    const publicKey = new PublicKey(walletAddress);
    
    // Connect to Solana using Helius RPC endpoint from .env
    const connection = new Connection(process.env.RPC_API_URL || 'https://api.devnet.solana.com', 'confirmed');
    
    // Fetch the transaction signatures
    const signatures = await connection.getSignaturesForAddress(
      publicKey,
      { limit: 20 } // Limit to 20 most recent transactions
    );
    
    return NextResponse.json({ transactions: signatures });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
} 