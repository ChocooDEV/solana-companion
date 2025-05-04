import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('wallet');
  const lastUpdatedStr = searchParams.get('lastUpdated');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {    
    // Check if the companion was updated today
    let canSync = true;
    let hoursUntilNextSync = 0;
    
    if (lastUpdatedStr) {
      const lastUpdated = new Date(lastUpdatedStr);
      const now = new Date();
      
      // Check if the last update was today (same day)
      const lastUpdateDay = lastUpdated.toDateString();
      const todayDay = now.toDateString();
      
      if (lastUpdateDay === todayDay) {
        canSync = false;
        
        // Calculate hours until next sync (midnight)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const hoursRemaining = (tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60);
        hoursUntilNextSync = Math.ceil(hoursRemaining);
      }
    }
    
    // If can't sync, return early with a message
    if (!canSync) {
      return NextResponse.json({
        success: true,
        experiencePoints: 0,
        canSync: false,
        message: `You've already synced today. You can sync again in ${hoursUntilNextSync} hours.`,
        hoursUntilNextSync
      });
    }
    
    // Instead of fetching transactions directly, use the existing transactions API
    const transactionsResponse = await fetch(
      `${request.nextUrl.origin}/api/transactions?wallet=${walletAddress}`
    );
    
    if (!transactionsResponse.ok) {
      throw new Error(`Failed to fetch transactions: ${transactionsResponse.statusText}`);
    }
    
    const transactionsData = await transactionsResponse.json();
    const recentSignatures = transactionsData.transactions || [];
    
    // Calculate experience points based on transaction count and types
    let experiencePoints = 0;
    const transactionTypes = new Set();
    
    // Process each transaction to calculate XP
    for (const sig of recentSignatures) {
      // Fetch transaction details to determine type
      const txDetailsResponse = await fetch(
        `${request.nextUrl.origin}/api/transaction-details?signature=${sig.signature}&wallet=${walletAddress}`
      );
      
      if (txDetailsResponse.ok) {
        const txDetails = await txDetailsResponse.json();
        
        // Base XP for any transaction
        experiencePoints += 5;
        
        // Bonus XP for different transaction types
        if (txDetails.type && !transactionTypes.has(txDetails.type)) {
          transactionTypes.add(txDetails.type);
          experiencePoints += 3; // Bonus for transaction diversity
        }
        
        // Additional bonuses based on transaction type or AI explanation
        if (txDetails.type.toLowerCase() === "nft" || 
            txDetails.type.toLowerCase() === "nft mint" || 
            txDetails.aiExplanation?.toLowerCase().includes("nft mint") || 
            txDetails.aiExplanation?.toLowerCase().includes("nft purchase")
        ) {
          experiencePoints += 10;
        } else if (txDetails.type.toLowerCase() === "swap" || 
                  txDetails.aiExplanation?.toLowerCase().includes("swap")) {
          experiencePoints += 5;
        } else if (txDetails.type.toLowerCase() === "stake" || 
                  txDetails.type.toLowerCase() === "unstake" || 
                  txDetails.aiExplanation?.toLowerCase().includes("stake")) {
          experiencePoints += 8;
        } else if (txDetails.type.toLowerCase() === "token transfer" || 
                  txDetails.aiExplanation?.toLowerCase().includes("transfer")) {
          experiencePoints += 1;
        }
        
        // Give more points if the wallet sent something vs received something
        if (txDetails.direction === "out" || 
            txDetails.aiExplanation?.toLowerCase().includes("sent") ||
            txDetails.aiExplanation?.toLowerCase().includes("transferred to")) {
          experiencePoints += 3; // Bonus for sending transactions
        } else if (txDetails.direction === "in" ||
                  txDetails.aiExplanation?.toLowerCase().includes("received") ||
                  txDetails.aiExplanation?.toLowerCase().includes("transferred from")) {
          experiencePoints += 1; // Smaller bonus for receiving
        }
      }
    }
    
    // Cap the maximum XP gain per day to 100
    experiencePoints = Math.min(experiencePoints, 100);
    
    return NextResponse.json({
      success: true,
      experiencePoints,
      canSync: true,
      transactionCount: recentSignatures.length,
      lastUpdateTime: new Date().toISOString(),
      currentTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating experience:', error);
    return NextResponse.json(
      { error: 'Failed to calculate experience points' },
      { status: 500 }
    );
  }
} 