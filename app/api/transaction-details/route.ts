import { NextRequest, NextResponse } from 'next/server';
import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const signature = searchParams.get('signature');
  const walletAddress = searchParams.get('wallet');

  if (!signature) {
    return NextResponse.json(
      { error: 'Transaction signature is required' },
      { status: 400 }
    );
  }

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
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

    // Determine if this is a SEND or RECEIVE transaction
    let action = 'OTHER';
    
    try {
      // Check if the connected wallet is the fee payer (sender)
      const feePayer = transaction.transaction.message.accountKeys[0].pubkey.toString();
      
      if (feePayer === walletAddress) {
        action = 'SEND';
      } else {
        // Check if the wallet is a recipient by looking at token transfers or SOL transfers
        const instructions = transaction.transaction.message.instructions;
        const accountKeys = transaction.transaction.message.accountKeys.map(key => key.pubkey.toString());
        
        // If the wallet appears in the account keys but is not the fee payer, it's likely a RECEIVE
        if (accountKeys.includes(walletAddress)) {
          action = 'RECEIVE';
        }
        
        // For more accurate detection, we could analyze the parsed instructions
        // to look for specific token transfer programs and check the destination
        if (transaction.meta && transaction.meta.postTokenBalances && transaction.meta.preTokenBalances) {
          const preBalances = transaction.meta.preTokenBalances;
          const postBalances = transaction.meta.postTokenBalances;
          
          // Check if any token account owned by this wallet increased in balance
          for (let i = 0; i < postBalances.length; i++) {
            const postBalance = postBalances[i];
            const preBalance = preBalances.find(b => b.accountIndex === postBalance.accountIndex);
            
            if (postBalance.owner === walletAddress) {
              if (!preBalance || Number(postBalance.uiTokenAmount.amount) > Number(preBalance.uiTokenAmount.amount)) {
                action = 'RECEIVE';
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error determining transaction action:', error);
    }

    let type = 'Transaction';
    let summary = 'See advanced details for more information';
    
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
      aiExplanation: aiExplanation?.summary ? aiExplanation.summary.replace(/\.$/, '') : null,
      action: determineAction(action, type, summary, aiExplanation?.summary || null)
    });
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}

// Helper function to determine the final action based on all available data
function determineAction(
  initialAction: string,
  type: string,
  summary: string,
  aiExplanation: string | null
): string {
  // If the transaction is already identified as SEND or RECEIVE, check if we need to override
  if (aiExplanation) {
    const lowerCaseExplanation = aiExplanation.toLowerCase();
    if (lowerCaseExplanation.includes('claim') || lowerCaseExplanation.includes('mint')) {
      return 'RECEIVE';
    }
  }
  
  if (type) {
    const lowerCaseType = type.toLowerCase();
    if (lowerCaseType.includes('claim') || lowerCaseType.includes('mint')) {
      return 'RECEIVE';
    }
  }
  
  if (summary) {
    const lowerCaseSummary = summary.toLowerCase();
    if (lowerCaseSummary.includes('claim') || lowerCaseSummary.includes('mint')) {
      return 'RECEIVE';
    }
  }
  
  return initialAction;
}

// Function to get transaction data
async function getOrbTransactionData(
  signature: string,
  cluster: string = 'mainnet-beta'
): Promise<{ type: string, summary: string } | null> {
  try {
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