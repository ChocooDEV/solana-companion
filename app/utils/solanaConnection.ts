import { Connection, Commitment } from '@solana/web3.js';

// Cache for the RPC URL
let cachedRpcUrl: string | null = null;

export async function getRpcUrl(): Promise<string> {
  if (cachedRpcUrl) return cachedRpcUrl;
  
  try {
    // Check if we're in a browser or server environment
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer 
      ? process.env.VERCEL_URL 
        ? 'http://localhost:3000'//`https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000'
      : '';
      
    const response = await fetch(`${baseUrl}/api/env?key=RPC_API_URL`);
    if (!response.ok) {
      throw new Error('Failed to fetch RPC URL');
    }
    
    const data = await response.json();
    cachedRpcUrl = /*data.value || */ 'https://api.devnet.solana.com';
    return cachedRpcUrl as string;
  } catch (error) {
    console.error('Error fetching RPC URL:', error);
    return 'https://api.devnet.solana.com'; // Fallback
  }
}

// Connection cache
const connectionCache: Record<string, Connection> = {};

export async function getSolanaConnection(commitment: Commitment = 'confirmed'): Promise<Connection> {
  const cacheKey = commitment;
  
  if (connectionCache[cacheKey]) {
    console.log('Returning cached connection');
    return connectionCache[cacheKey];
  }
  
  const rpcUrl = await getRpcUrl();
  console.log('Creating new connection with RPC URL:', rpcUrl);
  const connection = new Connection(rpcUrl, commitment);
  
  // Verify the connection is valid
  console.log('Connection created, testing with getVersion()');
  try {
    await connection.getVersion();
    console.log('Connection verified');
  } catch (e) {
    console.error('Connection test failed:', e);
  }
  
  connectionCache[cacheKey] = connection;
  return connection;
}