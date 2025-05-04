import { Connection, Commitment } from '@solana/web3.js';

// Cache the connection to avoid creating a new one for each request
const connectionCache: { [key: string]: Connection } = {};

export async function getRpcUrl() {
  try {
    // Use absolute URL with the base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/env?key=RPC_API_URL`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch RPC URL from API');
    }
    
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error getting RPC URL:', error);
    
    // Fallback to environment variable directly
    const fallbackUrl = process.env.RPC_API_URL || 'https://api.devnet.solana.com';
    console.log('Using fallback RPC URL:', fallbackUrl);
    return fallbackUrl;
  }
}

export async function getSolanaConnection(commitment: Commitment = 'confirmed'): Promise<Connection> {
  try {
    const cacheKey = `connection-${commitment}`;
    
    // Return cached connection if available
    if (connectionCache[cacheKey]) {
      return connectionCache[cacheKey];
    }
    
    // Get RPC URL
    const rpcUrl = await getRpcUrl();
    
    // Ensure URL starts with http:// or https://
    if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
      throw new Error('Endpoint URL must start with `http:` or `https:`.');
    }
    
    // Create new connection
    const connection = new Connection(rpcUrl, commitment);
    
    // Cache the connection
    connectionCache[cacheKey] = connection;
    
    return connection;
  } catch (error) {
    console.error('Error creating Solana connection:', error);
    // Fallback to devnet if there's an error
    const fallbackUrl = 'https://api.devnet.solana.com';
    const connection = new Connection(fallbackUrl, commitment);
    return connection;
  }
}