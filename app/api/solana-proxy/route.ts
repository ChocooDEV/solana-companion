import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the RPC URL from environment variables
    const rpcUrl = process.env.RPC_API_URL || 'https://api.devnet.solana.com';
    console.log('RPC URL:', rpcUrl);
    // Get the request body (the JSON-RPC request)
    const body = await request.json();
    
    // Forward the request to the actual Solana RPC endpoint
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Solana proxy:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 