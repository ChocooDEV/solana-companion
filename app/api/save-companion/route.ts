import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, companion, mintAddress, metadataUri } = await request.json();
    
    if (!walletAddress || !companion || !mintAddress || !metadataUri) {
      return NextResponse.json(
        { error: 'Wallet address, companion data, mint address, and metadata URI are required' },
        { status: 400 }
      );
    }
    
    // We don't need to save anything server-side since all data is on Irys
    // Just return the metadataUri which points to the Irys storage
    
    return NextResponse.json({
      success: true,
      message: 'Companion data saved successfully on Irys', // TODO: Remove this message
      metadataUri
    });
  } catch (error) {
    console.error('Error processing companion data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process companion data' },
      { status: 500 }
    );
  }
} 