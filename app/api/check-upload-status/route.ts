import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metadataUri } = body;
    
    if (!metadataUri) {
      return NextResponse.json(
        { success: false, error: 'Missing metadata URI' },
        { status: 400 }
      );
    }
    
    console.log('Checking metadata URI:', metadataUri);
    
    // Try to fetch the metadata to see if it's accessible
    try {
      const response = await fetch(metadataUri);
      
      if (response.ok) {
        // Successfully fetched the metadata
        const metadata = await response.json();
        console.log('Metadata found:', metadata ? 'Yes' : 'No');
        
        return NextResponse.json({
          success: true,
          confirmed: true,
          message: 'Metadata is accessible'
        });
      } else {
        console.log('Metadata fetch failed with status:', response.status);
        return NextResponse.json({
          success: true,
          confirmed: false,
          message: `Metadata not yet accessible (status: ${response.status})`
        });
      }
    } catch (fetchError) {
      console.error('Error fetching metadata:', fetchError);
      return NextResponse.json({
        success: true,
        confirmed: false,
        message: 'Error accessing metadata'
      });
    }
    
  } catch (error) {
    console.error('Error checking upload status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 