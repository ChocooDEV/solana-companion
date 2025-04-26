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
    
    // Fetch the transaction signatures with time filter
    const signatures = await connection.getSignaturesForAddress(
      publicKey,
      { 
        limit: 100 // Set a reasonable limit
      }
    );
    
    // Filter the results by timestamp after fetching
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const filteredSignatures = signatures.filter(sig => {
      if (!sig.blockTime) return false;
      const txTime = new Date(sig.blockTime * 1000); // Convert blockTime to milliseconds
      return txTime >= oneDayAgo;
    });
    
    return NextResponse.json({ transactions: filteredSignatures });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
} 