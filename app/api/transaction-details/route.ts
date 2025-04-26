import { NextRequest, NextResponse } from 'next/server';
import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const signature = searchParams.get('signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Transaction signature is required' },
      { status: 400 }
    );
  }

  try {
    // Connect to Solana using Helius RPC endpoint from .env
    const connection = new Connection(process.env.RPC_API_URL || 'https://api.devnet.solana.com', 'confirmed');
    
    // Fetch the transaction details
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Get transaction type and summary from Orb API
    let type = 'Transaction';
    let summary = 'Transaction details';
    
    try {
      const orbData = await getOrbTransactionData(signature);
      if (orbData) {
        type = orbData.type;
        summary = orbData.summary;
      }
    } catch (error) {
      console.error('Error fetching Orb transaction data:', error);
    }

    // Use Helius AI Transaction Explainer for AI explanation
    let aiExplanation = null;
    try {
      aiExplanation = await getHeliusAIExplanation(transaction, 'mainnet-beta');
    } catch (error) {
      console.error('Error using Helius AI Explainer:', error);
    }

    // Return combined data
    return NextResponse.json({
      type: type === "Unknown" ? "Generic" : type,
      summary: type === "Unknown" || type === "Transaction" ? "See advanced details for more information" : summary.replace(/\.$/, ''),
      aiExplanation: aiExplanation?.summary ? aiExplanation.summary.replace(/\.$/, '') : null
    });
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}

// Function to get transaction data from Orb API
async function getOrbTransactionData(
  signature: string,
  cluster: string = 'mainnet-beta'
): Promise<{ type: string, summary: string } | null> {
  try {
    // Try using the Helius Transaction API instead of Orb
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      console.warn('HELIUS_API_KEY not found in environment variables');
      return null;
    }

    const response = await fetch(`https://api.helius.xyz/v0/transactions/?api-key=${heliusApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactions: [signature]
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data.length > 0 && data[0]) {
        const txData = data[0];
        // Extract meaningful information from the transaction data
        const type = txData.type || txData.description?.split(' ')[0] || 'Transaction';
        const summary = txData.description || 'Transaction details';
        
        return {
          type,
          summary
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error calling Helius Transaction API:', error);
    return null;
  }
}

// Function to call Helius AI Transaction Explainer
async function getHeliusAIExplanation(
  transaction: ParsedTransactionWithMeta,
  cluster: string = 'mainnet-beta'
): Promise<{ type: string, summary: string } | null> {
  try {
    // Check if we have the Helius API key
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      console.warn('HELIUS_API_KEY not found in environment variables');
      return null;
    }

    // Prepare the payload for the AI Explainer API
    const payload = {
      transaction: transaction,
      cluster: cluster
    };

    // Call the Helius AI Transaction Explainer API
    const response = await fetch('https://orb-api.helius-rpc.com/api/ai-transaction-explainer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${heliusApiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Helius AI Explainer API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the content from the response
    if (data && data.content) {
      // Parse the AI explanation to extract type and summary
      const content = data.content;
      
      // Extract the transaction type from the first line or heading
      const titleMatch = content.match(/^#\s*(.*?)(?:\n|$)/);
      const type = titleMatch ? titleMatch[1].trim() : 'Transaction';
      
      // Use the rest of the content as the summary, removing markdown formatting
      let summary = content
        .replace(/^#.*\n/, '') // Remove the title
        .replace(/<address>(.*?)<\/address>/g, '$1') // Remove address tags
        .replace(/[•*]/g, '') // Remove bullet points and asterisks
        .replace(/\.$/, '') // Remove trailing period
        .trim();
      
      //console.log('Helius AI Explanation:', { type, summary });
      return { type, summary };
    }
    
    return null;
  } catch (error) {
    console.error('Error calling Helius AI Transaction Explainer:', error);
    return null;
  }
} 