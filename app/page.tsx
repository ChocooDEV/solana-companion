import Image from "next/image";
import Link from "next/link";
import { WalletConnect } from './components/WalletConnect';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <h1 className="text-3xl font-bold">Solana Companion</h1>
        
        <WalletConnect />
        
        <div className="flex gap-4 items-center flex-col sm:flex-row mt-8">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/transactions"
          >
            View Transactions
          </Link>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://solana.com/developers"
          target="_blank"
          rel="noopener noreferrer"
        >
          Solana Developers
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://docs.solana.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Solana Docs
        </a>
      </footer>
    </div>
  );
}
