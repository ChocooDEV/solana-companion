'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Companion } from '../types/companion';
import { getSolanaConnection } from '../utils/solanaConnection';
import { Transaction } from '@solana/web3.js';

interface CompanionProgressProps {
  companion: Companion;
  mintAddress: string;
  onUpdate: (updatedCompanion: Companion) => void;
}

export const CompanionProgress: FC<CompanionProgressProps> = ({ 
  companion, 
  mintAddress, 
  onUpdate 
}) => {
  const { publicKey, wallet, signTransaction } = useWallet();
  const [experiencePoints, setExperiencePoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Calculate potential new level based on current experience + new XP
  const calculateNewLevel = (currentLevel: number, currentExp: number, newExp: number) => {
    const totalExp = currentExp + newExp;
    // Simple level formula: level up every 100 XP
    const newLevel = Math.floor(totalExp / 100);
    return newLevel > currentLevel ? newLevel : currentLevel;
  };

  // Fetch experience points on component mount
  useEffect(() => {
    const fetchExperience = async () => {
      if (!publicKey) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/calculate-experience?wallet=${publicKey.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to calculate experience points');
        }
        
        const data = await response.json();
        setExperiencePoints(data.experiencePoints);
      } catch (err) {
        console.error('Error fetching experience:', err);
        setError('Failed to calculate experience points. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExperience();
  }, [publicKey]);
  
  // Handle syncing progress
  const handleSyncProgress = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      // Calculate the updated companion data
      const updatedCompanion = {
        ...companion,
        experience: experiencePoints,
        level: calculateNewLevel(companion.level, companion.experience, experiencePoints),
        evolution: experiencePoints > 200 ? 3 : 
                 experiencePoints > 100 ? 2 : 
                 experiencePoints > 0 ? 1 : 0,
        lastUpdated: new Date().toISOString()
      };

      // Import the updateCompanionData function
      const { updateCompanionData } = await import('../utils/updateUtils');
      
      // Use the utility function to handle the update process
      const result = await updateCompanionData(
        { publicKey, signTransaction },
        mintAddress, 
        updatedCompanion
      );
      
      if (result.success) {
        setSuccess('Progress synced successfully!');
        onUpdate(updatedCompanion);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error syncing progress:', err);
      setError(`Error syncing progress: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="mt-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg flex items-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-3"></div>
        Calculating your progress...
      </div>
    );
  }
  
  return (
    <div className="mt-6 p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-xl font-bold text-[#333] mb-4">Daily Progress</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      
      <div className="mb-6">
        <p className="text-lg font-medium text-[#333]">
          You've earned <span className="text-[#ff6f61] font-bold">{experiencePoints} XP</span>
        </p>
        
        {experiencePoints > 0 && (
          <div className="mt-2">
            <p className="text-sm text-[#666]">
              Syncing will increase your companion's experience from {companion.experience} to {companion.experience + experiencePoints}.
              {calculateNewLevel(companion.level, companion.experience, experiencePoints) > companion.level && 
                ` Your companion will level up to level ${calculateNewLevel(companion.level, companion.experience, experiencePoints)}!`}
            </p>
          </div>
        )}
      </div>
      
      <button
        onClick={handleSyncProgress}
        disabled={isSyncing || experiencePoints === 0}
        className={`bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium py-2 px-6 rounded-lg transition duration-300 ease-in-out ${
          (isSyncing || experiencePoints === 0) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSyncing ? 'Syncing...' : 'Sync My Progress'}
      </button>
      
      <p className="mt-4 text-sm text-[#666]">
        Last updated: {companion.attributes.find(attr => attr.trait_type === "LastUpdated")?.value ? 
          new Date(companion.attributes.find(attr => attr.trait_type === "LastUpdated")?.value as string).toLocaleString() : 
          'Never'}
      </p>
    </div>
  );
}; 