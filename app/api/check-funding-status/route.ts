import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';
import { getSolanaConnection } from '@/app/utils/solanaConnection';
import bs58 from 'bs58';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fundingSignature } = body;
    
    if (!fundingSignature) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get the server wallet from environment variable instead of request
    if (!process.env.PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server wallet not configured' },
        { status: 500 }
      );
    }
    
    // Decode the private key and get the public key
    const privateKeyBytes = bs58.decode(process.env.PRIVATE_KEY);
    const serverWallet = Keypair.fromSecretKey(privateKeyBytes);
    const serverWalletPublicKey = serverWallet.publicKey;
    
    // Get connection
    const connection = await getSolanaConnection('confirmed');
    
    // Check if the transaction is confirmed
    const txStatus = await connection.getSignatureStatus(fundingSignature);
    console.log('Funding transaction status:', txStatus?.value?.confirmationStatus || 'unknown');
    
    if (!txStatus?.value?.confirmationStatus || txStatus.value.confirmationStatus !== 'confirmed') {
      return NextResponse.json({ 
        success: true, 
        funded: false, 
        message: 'Transaction not yet confirmed' 
      });
    }
    
    // Check the server wallet balance
    const balance = await connection.getBalance(serverWalletPublicKey);
    console.log('Server wallet balance:', balance / 1e9, 'SOL');
    
    // Consider the wallet funded if it has at least 0.005 SOL
    const isFunded = balance >= 5000000; // 0.005 SOL in lamports
    
    return NextResponse.json({
      success: true,
      funded: isFunded,
      balance: balance / 1e9
    });
    
  } catch (error) {
    console.error('Error checking funding status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 