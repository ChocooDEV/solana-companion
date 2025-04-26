'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ConfirmedSignatureInfo } from '@solana/web3.js';

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
    
    // Calculate date range in days
    let oldestDate: number | null = null;
    let newestDate: number | null = null;
    
    transactions.forEach(tx => {
      if (tx.blockTime) {
        if (oldestDate === null || tx.blockTime < oldestDate) oldestDate = tx.blockTime;
        if (newestDate === null || tx.blockTime > newestDate) newestDate = tx.blockTime;
      }
    });
    
    const daysDiff = oldestDate && newestDate 
      ? Math.ceil((newestDate - oldestDate) / (60 * 60 * 24)) 
      : 0;
    
    setStats({
      receive: receiveCount,
      send: sendCount,
      days: daysDiff
    });
  }, [transactions, transactionDetails]);

  if (!connected) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mt-12 space-y-8">
      <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
      
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-6 rounded-xl shadow-sm">
          {error}
        </div>
      )}
      
      {!loading && !error && transactions.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-black/[.02] dark:bg-white/[.03] rounded-xl border border-black/[.08] dark:border-white/[.145]">
          No transactions found for this wallet.
        </div>
      )}
      
      {!loading && !error && transactions.length > 0 && (
        <>
          <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-black/[.08] dark:border-white/[.145] rounded-xl p-6 bg-black/[.02] dark:bg-white/[.03] shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Received</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.receive}</div>
            </div>
            <div className="border border-black/[.08] dark:border-white/[.145] rounded-xl p-6 bg-black/[.02] dark:bg-white/[.03] shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Sent</div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.send}</div>
            </div>
            <div className="border border-black/[.08] dark:border-white/[.145] rounded-xl p-6 bg-black/[.02] dark:bg-white/[.03] shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Time Period</div>
              <div className="text-3xl font-bold">{stats.days} {stats.days === 1 ? 'day' : 'days'}</div>
            </div>
          </div>
          <div className="border border-black/[.08] dark:border-white/[.145] rounded-xl overflow-hidden shadow-sm mt-12">
            <table className="w-full min-w-[800px]">
              <thead className="bg-black/[.05] dark:bg-white/[.06]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Signature</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Summary</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold w-1/4">Advanced Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.08] dark:divide-white/[.145]">
                {transactions.map((tx) => (
                  <tr key={tx.signature} className="hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-mono">
                      <a 
                        href={`https://explorer.solana.com/tx/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {transactionDetails[tx.signature]?.action === 'SEND' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">SEND</span>
                      ) : transactionDetails[tx.signature]?.action === 'RECEIVE' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">RECEIVE</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">OTHER</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm max-w-[200px] break-words">
                      {transactionDetails[tx.signature]?.summary || 'Loading...'}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="max-h-[150px] overflow-y-auto pr-3 text-gray-700 dark:text-gray-300">
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
    </div>
  );
}; 