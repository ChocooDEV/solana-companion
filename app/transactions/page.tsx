import { WalletConnect } from '../components/WalletConnect';
import { TransactionHistory } from '../components/TransactionHistory';

export default function TransactionsPage() {
  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-8">Solana Transactions</h1>
      
      <WalletConnect />
      
      <TransactionHistory />
      
      <div className="mt-8">
        <a 
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Home
        </a>
      </div>
    </div>
  );
} 