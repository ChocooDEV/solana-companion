import { Transaction, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { Companion } from '../types/companion';
import { getSolanaConnection } from './solanaConnection';

export async function updateCompanionData(
  wallet: { publicKey: PublicKey; signTransaction: (transaction: Transaction) => Promise<Transaction> },
  mintAddress: string,
  updatedCompanion: Companion
): Promise<{ success: boolean; message: string; signature?: string }> {
  try {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return { success: false, message: 'Wallet not connected or does not support signing' };
    }

    console.log('Using wallet address:', wallet.publicKey.toString());

    // Fetch game configuration to get the correct evolution image
    const configResponse = await fetch('/api/game-config');
    if (!configResponse.ok) {
      throw new Error('Failed to load game configuration');
    }
    const gameConfig = await configResponse.json();
    
    // Get the correct image for this companion's evolution
    const companionName = updatedCompanion.name.toLowerCase();
    if (gameConfig.companionImages && 
        gameConfig.companionImages[companionName] && 
        gameConfig.companionImages[companionName][updatedCompanion.evolution]) {
      // Update the image based on evolution
      updatedCompanion.image = gameConfig.companionImages[companionName][updatedCompanion.evolution];
    }

    // 1. Get funding transaction
    const fundingResponse = await fetch(`/api/update-companion?walletAddress=${wallet.publicKey.toString()}`);
    const fundingResult = await fundingResponse.json();
    
    if (!fundingResult.success) {
      throw new Error(fundingResult.error || 'Failed to prepare funding transaction');
    }
    
    // 2. Sign and send the funding transaction
    const connection = await getSolanaConnection('confirmed');
    const fundingTxBuffer = Buffer.from(fundingResult.fundingTransaction, 'base64');
    const fundingTx = Transaction.from(fundingTxBuffer);
    
    const signedFundingTx = await wallet.signTransaction(fundingTx);
    const fundingSignature = await connection.sendRawTransaction(
      signedFundingTx.serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: fundingSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });

    // 3. Request the server to handle metadata upload and prepare transaction
    console.log('Sending update request with:', {
      assetAddress: mintAddress,
      companionData: updatedCompanion,
      payerPublicKey: wallet.publicKey.toString(),
      serverSecretKey: fundingResult.serverSecretKey,
      fundingSignature: fundingSignature
    });

    const response = await fetch('/api/update-companion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetAddress: mintAddress,
        companionData: updatedCompanion,
        payerPublicKey: wallet.publicKey.toString(),
        serverSecretKey: fundingResult.serverSecretKey,
        fundingSignature: fundingSignature
      }),
    });

    const result = await response.json();
    if (!result.success) return { success: false, message: result.error };

    // 4. Client signs and sends the update transaction
    const transactionBuffer = Buffer.from(result.transaction, 'base64');
    
    // Deserialize as a versioned transaction
    const versionedTransaction = VersionedTransaction.deserialize(transactionBuffer);
    
    // Update the wallet type to accept VersionedTransaction
    const signedTransaction = await (wallet.signTransaction as unknown as (transaction: VersionedTransaction) => Promise<VersionedTransaction>)(versionedTransaction);
    
    // Send the signed transaction
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );

    // 5. Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });

    // 6. Verify the transaction with the server
    const verifyResponse = await fetch('/api/update-companion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signature,
        assetAddress: mintAddress
      }),
    });

    const verifyResult = await verifyResponse.json();
    if (!verifyResult.success) {
      return { success: false, message: verifyResult.error || 'Failed to verify transaction' };
    }

    return { success: true, message: 'Companion updated!', signature };
  } catch (error) {
    console.error('Error updating companion:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : String(error) 
    };
  }
} 