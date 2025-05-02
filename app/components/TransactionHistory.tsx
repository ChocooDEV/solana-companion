'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ConfirmedSignatureInfo } from '@solana/web3.js';
import { CompanionMint } from './CompanionMint';
import { checkCompanionOwnership } from '../services/companionService';
import { Connection } from '@solana/web3.js';
import { CompanionDisplay } from './CompanionDisplay';

interface TransactionDetail {
  type: string;
  summary: string;
  aiExplanation: string | null;
  action: string;
}

export const TransactionHistory: FC = () => {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState<ConfirmedSignatureInfo[]>([]);
  const [transactionDetails, setTransactionDetails] = useState<Record<string, TransactionDetail>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ receive: 0, send: 0, days: 0 });
  const [hasCompanion, setHasCompanion] = useState<boolean | null>(null);
  const [checkingCompanion, setCheckingCompanion] = useState(false);

  // Check if the wallet owns a companion
  useEffect(() => {
    const checkOwnership = async () => {
      if (!connected || !publicKey) {
        setHasCompanion(null);
        return;
      }

      setCheckingCompanion(true);
      try {
        const response = await fetch(`/api/check-companion?wallet=${publicKey.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to check companion ownership');
        }
        
        const data = await response.json();
        setHasCompanion(data.hasCompanion);
      } catch (err) {
        console.error('Error checking companion ownership:', err);
        setHasCompanion(false); // Assume no companion on error to allow minting
      } finally {
        setCheckingCompanion(false);
      }
    };

    checkOwnership();
  }, [publicKey, connected]);

  // Create a function to fetch transactions that can be called on demand
  const fetchTransactions = async () => {
    if (!connected || !publicKey) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/transactions?wallet=${publicKey.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Use the fetchTransactions function in the useEffect
  useEffect(() => {
    fetchTransactions();
  }, [publicKey, connected]);

  // Fetch transaction details for each transaction
  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (transactions.length === 0) return;

      const details: Record<string, TransactionDetail> = {};
      
      for (const tx of transactions) {
        try {
          const response = await fetch(`/api/transaction-details?signature=${tx.signature}&wallet=${publicKey?.toString()}`);
          if (response.ok) {
            const data = await response.json();
            details[tx.signature] = {
              type: data.type || 'Unknown',
              summary: data.summary || 'No summary available',
              aiExplanation: data.aiExplanation,
              action: data.action || 'UNKNOWN'
            };
          }
        } catch (error) {
          console.error(`Error fetching details for transaction ${tx.signature}:`, error);
        }
      }
      
      setTransactionDetails(details);
    };

    fetchTransactionDetails();
  }, [transactions, publicKey]);

  // Calculate transaction statistics
  useEffect(() => {
    if (transactions.length === 0 || Object.keys(transactionDetails).length === 0) return;
    
    let receiveCount = 0;
    let sendCount = 0;
    
    // Count transaction types
    Object.values(transactionDetails).forEach(detail => {
      if (detail.action === 'RECEIVE') receiveCount++;
      if (detail.action === 'SEND') sendCount++;
    });
    
    // Since the API already filters for the last day, we can simplify this
    setStats({
      receive: receiveCount,
      send: sendCount,
      days: 1 // The API is already filtering for 1 day
    });
  }, [transactions, transactionDetails]);

  if (!connected) {
    return null;
  }

  // Show companion minting if the wallet doesn't have a companion
  if (connected && hasCompanion === false && !checkingCompanion) {
    return <CompanionMint />;
  }

  // Show loading state while checking companion ownership
  if (checkingCompanion) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#444]"></div>
        <p className="text-[#444] text-lg">Checking for Solana Companion...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mt-12 space-y-8 p-8 sm:p-12 bg-gradient-to-b from-[#A0EACF] to-[#E0B0E5] rounded-2xl">      
      {hasCompanion && <CompanionDisplay />}
      
      {(loading || (transactions.length > 0 && Object.keys(transactionDetails).length < transactions.length)) ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#444]"></div>
          <p className="text-[#444] text-lg">Reading your on-chain activities...</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-white/90 backdrop-blur-sm border border-red-200 text-red-700 p-6 rounded-xl shadow-sm">
              {error}
            </div>
          )}
          
          {!error && transactions.length === 0 && (
            <div className="text-center py-12 text-[#444] bg-white/80 backdrop-blur-sm rounded-xl border border-black/[.08] shadow-md">
              <p className="mb-4">No transactions found for this wallet.</p>
              <button 
                onClick={fetchTransactions}
                className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4bc4] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6c5ce7]"
              >
                Refresh Transactions
              </button>
            </div>
          )}
          
          {!error && transactions.length > 0 && (
            <>
              <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-green-500">
                  <div className="text-sm text-[#555] mb-2">Received</div>
                  <div className="text-3xl font-bold text-green-600">{stats.receive}</div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-red-500">
                  <div className="text-sm text-[#555] mb-2">Sent</div>
                  <div className="text-3xl font-bold text-red-600">{stats.send}</div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-[#6c5ce7]">
                  <div className="text-sm text-[#555] mb-2">Time Period</div>
                  <div className="text-3xl font-bold text-[#333]">Last 24 hours</div>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 mt-12">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-black/[.05]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#333]">Signature</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#333]">Action</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#333]">Summary</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#333]">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#333] w-1/4">Advanced Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[.08]">
                    {transactions.map((tx) => (
                      <tr key={tx.signature} className="hover:bg-black/[.02] transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-mono">
                          <a 
                            href={`https://explorer.solana.com/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {transactionDetails[tx.signature]?.action === 'SEND' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">SEND</span>
                          ) : transactionDetails[tx.signature]?.action === 'RECEIVE' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">RECEIVE</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">OTHER</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm max-w-[200px] break-words text-[#444]">
                          {transactionDetails[tx.signature]?.summary || 'No summary available'}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-[#444]">
                          {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="max-h-[150px] overflow-y-auto pr-3 text-[#555]">
                            {transactionDetails[tx.signature]?.aiExplanation || 'No details available'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}; 