import { NextRequest, NextResponse } from 'next/server';
import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';

// Types
interface TransactionExplanation {
  type: string;
  summary: string;
  keyPoints?: string[];
  additionalContext?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const signature = searchParams.get('signature');
  const walletAddress = searchParams.get('wallet');

  // Validate required parameters
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
    console.log("using rpc: ", process.env.RPC_API_URL);
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

    // Determine initial transaction action based on transaction data
    let action = determineInitialAction(transaction, walletAddress);
    
    // Get AI explanation from Helius - this will be our primary source of data
    let type = 'Transaction';
    let summary = 'See advanced details for more information';
    let keyPoints = null;
    let additionalContext = null;
    
    try {
      const aiExplanation = await getHeliusAIExplanation(transaction);
      
      if (aiExplanation) {
        type = aiExplanation.type;
        summary = aiExplanation.summary;
        keyPoints = aiExplanation.keyPoints;
        additionalContext = aiExplanation.additionalContext;
        
        // Determine final action based on AI explanation data
        action = determineActionFromExplanation(action, aiExplanation);
      }
    } catch (error) {
      console.error('Error using Helius AI Explainer:', error);
    }
    

    // Return combined data with clearer structure
    return NextResponse.json({
      type: type === "Unknown" ? "Generic" : type,
      summary: summary.replace(/\.$/, ''),
      keyPoints: keyPoints,
      additionalContext: additionalContext,
      action: action
    });
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}

/**
 * Determines the initial transaction action based on transaction data
 */
function determineInitialAction(
  transaction: ParsedTransactionWithMeta,
  walletAddress: string
): string {
  let action = 'OTHER';
  
  try {
    // Check if the connected wallet is the fee payer (sender)
    const feePayer = transaction.transaction.message.accountKeys[0].pubkey.toString();
    
    if (feePayer === walletAddress) {
      action = 'SEND';
    } else {
      // Check if the wallet is a recipient by looking at token transfers or SOL transfers
      const accountKeys = transaction.transaction.message.accountKeys.map(key => key.pubkey.toString());
      
      // If the wallet appears in the account keys but is not the fee payer, it's likely a RECEIVE
      if (accountKeys.includes(walletAddress)) {
        action = 'RECEIVE';
      }
      
      // Check token balances for more accurate detection
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
            } else if (preBalance && Number(postBalance.uiTokenAmount.amount) < Number(preBalance.uiTokenAmount.amount)) {
              // If token balance decreased and this wallet is the owner, it could be a BURN or SEND
              // Check if the transaction has burn instructions or if tokens disappeared (not transferred)
              const isBurn = detectBurnOperation(transaction);
              if (isBurn) {
                action = 'BURNED';
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error determining transaction action:', error);
  }
  
  return action;
}

/**
 * Detects if a transaction contains a burn operation
 */
function detectBurnOperation(transaction: ParsedTransactionWithMeta): boolean {
  try {
    // Check for burn instructions in parsed instructions
    if (transaction.meta?.innerInstructions) {
      for (const innerInstructionSet of transaction.meta.innerInstructions) {
        for (const instruction of innerInstructionSet.instructions) {
          // Check for parsed instruction data
          if ('parsed' in instruction && instruction.parsed) {
            const parsedData = instruction.parsed;
            
            // Check for token program burn instruction
            if (parsedData.type === 'burn' || 
                (typeof parsedData === 'object' && 
                 'info' in parsedData && 
                 parsedData.info && 
                 'instruction' in parsedData.info && 
                 parsedData.info.instruction === 'Burn')) {
              return true;
            }
          }
        }
      }
    }
    
    // Check for burn in the main instructions
    if (transaction.transaction?.message?.instructions) {
      for (const instruction of transaction.transaction.message.instructions) {
        if ('parsed' in instruction && instruction.parsed) {
          const parsedData = instruction.parsed;
          
          // Check for token program burn instruction
          if (parsedData.type === 'burn' || 
              (typeof parsedData === 'object' && 
               'info' in parsedData && 
               parsedData.info && 
               'instruction' in parsedData.info && 
               parsedData.info.instruction === 'Burn')) {
            return true;
          }
        }
      }
    }
    
    // Check for program names that might indicate burning
    const programIds = transaction.transaction?.message?.accountKeys
      .filter(key => key.signer === false && key.writable === false)
      .map(key => key.pubkey.toString());
    
    // Known burn program IDs (can be expanded)
    const burnProgramIds = [
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', // Token Metadata Program
      'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d', // Core NFT program
    ];
    
    if (programIds && programIds.some(id => burnProgramIds.includes(id))) {
      // If a known burn program is involved, check logs for burn operations
      if (transaction.meta?.logMessages) {
        const logs = transaction.meta.logMessages.join(' ');
        if (logs.toLowerCase().includes('burn') || 
            logs.toLowerCase().includes('burning') || 
            logs.toLowerCase().includes('burned')) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error detecting burn operation:', error);
    return false;
  }
}

/**
 * Determines the final action based on AI explanation data
 */
function determineActionFromExplanation(
  initialAction: string,
  aiExplanation: TransactionExplanation
): string {
  // Check for specific transaction types in the explanation
  const checkForKeywords = (text: string | undefined | null): string | null => {
    if (!text) return null;
    
    const lowerCaseText = text.toLowerCase();
    if (lowerCaseText.includes('burn') || lowerCaseText.includes('burned')) return 'BURNED';
    if (lowerCaseText.includes('claim') || lowerCaseText.includes('mint')) return 'RECEIVE';
    return null;
  };
  
  // Check each field of the explanation for relevant keywords
  const summaryAction = checkForKeywords(aiExplanation.summary);
  if (summaryAction) return summaryAction;
  
  const typeAction = checkForKeywords(aiExplanation.type);
  if (typeAction) return typeAction;
  
  const keyPointsAction = aiExplanation.keyPoints ? 
    checkForKeywords(aiExplanation.keyPoints.join(' ')) : null;
  if (keyPointsAction) return keyPointsAction;
  
  const contextAction = checkForKeywords(aiExplanation.additionalContext);
  if (contextAction) return contextAction;
  
  return initialAction;
}

/**
 * Calls Helius AI Transaction Explainer API and returns structured data
 */
async function getHeliusAIExplanation(
  transaction: ParsedTransactionWithMeta,
  cluster: string = 'mainnet-beta'
): Promise<TransactionExplanation | null> {
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
      // Handle structured object response
      if (typeof data.content === 'object') {
        const content = data.content;
        
        // Apply the same replacements to all text fields
        const cleanText = (text: string) => {
          return text
            .replace(/<address>(.*?)<\/address>/g, '$1')
            .replace(/[•*]/g, '')
            .replace(/\.$/, '')
            .trim();
        };
        
        const summary = content.summary ? cleanText(content.summary) : 'Transaction details';
        
        // Process keyPoints array if it exists
        let keyPoints = content.keyPoints;
        if (keyPoints && Array.isArray(keyPoints)) {
          keyPoints = keyPoints.map(point => cleanText(point));
        }
        
        // Process additionalContext if it exists
        const additionalContext = content.additionalContext ? 
          cleanText(content.additionalContext) : undefined;
        
        return { 
          type: content.header?.transactionType || 'Transaction', 
          summary,
          keyPoints,
          additionalContext
        };
      } 
      // Handle string response (legacy format)
      else if (typeof data.content === 'string') {
        const content = data.content;
        const titleMatch = content.match(/^#\s*(.*?)(?:\n|$)/);
        const type = titleMatch ? titleMatch[1].trim() : 'Transaction';
        
        const summary = content
          .replace(/^#.*\n/, '')
          .replace(/<address>(.*?)<\/address>/g, '$1')
          .replace(/[•*]/g, '')
          .replace(/\.$/, '')
          .trim();
        
        return { type, summary };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error calling Helius AI Transaction Explainer:', error);
    return null;
  }
} 