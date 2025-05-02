import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  
  // Only allow specific environment variables to be accessed
  const allowedKeys = ['COLLECTION_ADDRESS', 'RPC_API_URL', 'BACKEND_WALLET_ADDRESS'];
  
  if (!key || !allowedKeys.includes(key)) {
    return NextResponse.json(
      { error: 'Invalid or missing key parameter' },
      { status: 400 }
    );
  }
  
  const value = process.env[key];
  
  if (!value) {
    return NextResponse.json(
      { error: `Environment variable ${key} not found` },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ value });
} 