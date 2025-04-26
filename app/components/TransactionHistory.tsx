'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ConfirmedSignatureInfo } from '@solana/web3.js';

interface TransactionDetail {
  type: string;
  summary: string;
  aiExplanation: string | null;
}

export const TransactionHistory: FC = () => {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState<ConfirmedSignatureInfo[]>([]);
  const [transactionDetails, setTransactionDetails] = useState<Record<string, TransactionDetail>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    fetchTransactions();
  }, [publicKey, connected]);

  // Fetch transaction details for each transaction
  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (transactions.length === 0) return;

      const details: Record<string, TransactionDetail> = {};
      
      for (const tx of transactions) {
        try {
          const response = await fetch(`/api/transaction-details?signature=${tx.signature}`);
          if (response.ok) {
            const data = await response.json();
            details[tx.signature] = {
              type: data.type || 'Unknown',
              summary: data.summary || 'No summary available',
              aiExplanation: data.aiExplanation
            };
          }
        } catch (error) {
          console.error(`Error fetching details for transaction ${tx.signature}:`, error);
        }
      }
      
      setTransactionDetails(details);
    };

    fetchTransactionDetails();
  }, [transactions]);

  if (!connected) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mt-8">
      <h2 className="text-xl font-bold mb-4">Transaction History</h2>
      
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-md">
          {error}
        </div>
      )}
      
      {!loading && !error && transactions.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No transactions found for this wallet.
        </div>
      )}
      
      {!loading && !error && transactions.length > 0 && (
        <div className="border border-black/[.08] dark:border-white/[.145] rounded-lg overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-black/[.05] dark:bg-white/[.06]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Signature</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Summary</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Block Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold w-1/4">Advanced Details</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.signature} className="border-t border-black/[.08] dark:border-white/[.145]">
                  <td className="px-4 py-3 text-sm font-mono">
                    <a 
                      href={`https://explorer.solana.com/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {transactionDetails[tx.signature]?.type 
                      ? transactionDetails[tx.signature].type.charAt(0).toUpperCase() + 
                        transactionDetails[tx.signature].type.slice(1).toLowerCase()
                      : 'Loading...'}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[200px] break-words">
                    {transactionDetails[tx.signature]?.summary || 'Loading...'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {tx.err ? (
                      <span className="text-red-600 dark:text-red-400">Failed</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">Success</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {transactionDetails[tx.signature]?.aiExplanation ? (
                      <div className="max-h-[150px] overflow-y-auto pr-2">
                        {transactionDetails[tx.signature]?.aiExplanation}
                      </div>
                    ) : (
                      <a 
                        href={`https://orb.helius.dev/tx/${tx.signature}?cluster=mainnet-beta`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View in Orb
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}; 