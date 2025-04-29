import { NextRequest, NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';

export async function POST(request: NextRequest) {
  try {
    const { signedTransaction, assetAddress } = await request.json();
    
    if (!signedTransaction) {
      return NextResponse.json({ error: 'Signed transaction is required' }, { status: 400 });
    }
    
    // Create connection to Solana
    const connection = new Connection(/*process.env.RPC_API_URL || */'https://api.devnet.solana.com', 'confirmed');
    
    // Deserialize the transaction
    const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));
    
    // Submit the transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    
    // Wait for confirmation - using the non-deprecated method
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    return NextResponse.json({ 
      success: true, 
      signature,
      assetAddress
    });
  } catch (error) {
    console.error('Error submitting transaction:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to submit transaction: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 