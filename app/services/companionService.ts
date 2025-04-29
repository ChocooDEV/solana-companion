import { Connection, PublicKey } from '@solana/web3.js';
import { Companion } from '../types/companion';

export async function checkCompanionOwnership(
  walletAddress: string,
  connection: Connection
): Promise<boolean> {
  try {
    // This is a simplified check - you'll need to implement the actual logic
    // to check for your specific NFT collection
    const nftsResponse = await fetch(`/api/check-companion?wallet=${walletAddress}`);
    const { hasCompanion } = await nftsResponse.json();
    return hasCompanion;
  } catch (error) {
    console.error('Error checking companion ownership:', error);
    return false;
  }
}

export async function mintCompanion(
  walletAddress: string,
  companion: Omit<Companion, 'dateOfBirth'>
): Promise<{ success: boolean; message: string; companionData?: Companion }> {
  try {
    const response = await fetch('/api/mint-companion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        companion: {
          ...companion,
          dateOfBirth: new Date().toISOString(),
        },
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Error minting companion:', error);
    return { success: false, message: 'Failed to mint companion' };
  }
} 