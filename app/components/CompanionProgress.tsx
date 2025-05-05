'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Companion } from '../types/companion';

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
  const { publicKey, signTransaction } = useWallet();
  const [experiencePoints, setExperiencePoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [gameConfig, setGameConfig] = useState<{
    levelThresholds: number[];
    evolutionThresholds: number[];
  } | null>(null);
  
  // Calculate level based on total XP and level thresholds
  const calculateLevel = (totalExp: number) => {
    if (!gameConfig) return 0;
    
    for (let i = gameConfig.levelThresholds.length - 1; i >= 0; i--) {
      if (totalExp >= gameConfig.levelThresholds[i]) {
        return i;
      }
    }
    return 0;
  };
  
  // Calculate evolution based on level and evolution thresholds
  const calculateEvolution = (level: number) => {
    if (!gameConfig) return 0;
    
    for (let i = gameConfig.evolutionThresholds.length - 1; i >= 0; i--) {
      if (level >= gameConfig.evolutionThresholds[i]) {
        return i;
      }
    }
    return 0;
  };
  
  // Calculate XP needed for next level
  const getXpForNextLevel = (currentLevel: number, currentExp: number) => {
    if (!gameConfig || currentLevel >= gameConfig.levelThresholds.length - 1) {
      return 0; // Max level reached
    }
    
    return gameConfig.levelThresholds[currentLevel + 1] - currentExp;
  };

  // Fetch game configuration and experience points on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!publicKey) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch game configuration
        const configResponse = await fetch('/api/game-config');
        if (!configResponse.ok) {
          throw new Error('Failed to load game configuration');
        }
        const configData = await configResponse.json();
        setGameConfig(configData);
        
        // Get the last updated date from companion attributes
        const lastUpdatedAttr = companion.attributes.find(attr => attr.trait_type === "LastUpdated");
        const lastUpdated = lastUpdatedAttr ? lastUpdatedAttr.value : null;
        
        // Fetch experience points
        const expResponse = await fetch(`/api/calculate-experience?wallet=${publicKey.toString()}&lastUpdated=${lastUpdated || ''}`);
        if (!expResponse.ok) {
          throw new Error('Failed to calculate experience points');
        }
        const expData = await expResponse.json();
        
        setExperiencePoints(expData.experiencePoints);
        
        // If user can't sync today, show a message
        if (expData.canSync === false) {
          setError(expData.message);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load necessary data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [publicKey, companion.attributes]);
  
  // Handle syncing progress
  const handleSyncProgress = async () => {
    if (!publicKey || !signTransaction || !gameConfig) {
      setError('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const totalExp = companion.experience + experiencePoints;
      const newLevel = calculateLevel(totalExp);
      
      // Calculate the updated companion data
      const updatedCompanion = {
        ...companion,
        experience: totalExp,
        level: newLevel,
        evolution: calculateEvolution(newLevel),
        xpForNextLevel: getXpForNextLevel(newLevel, totalExp),
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
        
        // Reset experience points after successful sync
        setExperiencePoints(0);
        
        // Refresh the component data
        const fetchUpdatedData = async () => {
          try {
            // Get the last updated date from companion attributes
            const lastUpdatedAttr = updatedCompanion.attributes.find(attr => attr.trait_type === "LastUpdated");
            const lastUpdated = lastUpdatedAttr ? lastUpdatedAttr.value : null;
            
            // Fetch experience points with updated lastUpdated value
            const expResponse = await fetch(`/api/calculate-experience?wallet=${publicKey.toString()}&lastUpdated=${lastUpdated || ''}`);
            if (expResponse.ok) {
              const expData = await expResponse.json();
              // This should be 0 if we just synced, but we update it anyway
              setExperiencePoints(expData.experiencePoints);
            }
          } catch (err) {
            console.error('Error refreshing data after sync:', err);
          }
        };
        
        fetchUpdatedData();
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
  
  useEffect(() => {
    const handleTransactionsRefreshed = async (event: CustomEvent) => {
      if (!publicKey) return;
      
      // Only refresh if this is for our wallet
      if (event.detail.walletAddress !== publicKey.toString()) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the last updated date from companion attributes
        const lastUpdatedAttr = companion.attributes.find(attr => attr.trait_type === "LastUpdated");
        const lastUpdated = lastUpdatedAttr ? lastUpdatedAttr.value : null;
        
        // Fetch experience points with updated lastUpdated value
        const expResponse = await fetch(`/api/calculate-experience?wallet=${publicKey.toString()}&lastUpdated=${lastUpdated || ''}`);
        if (expResponse.ok) {
          const expData = await expResponse.json();
          setExperiencePoints(expData.experiencePoints);
          
          // If user can't sync today, show a message
          if (expData.canSync === false) {
            setError(expData.message);
          } else {
            setError(null);
          }
        }
      } catch (err) {
        console.error('Error refreshing experience data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Add event listener
    window.addEventListener('transactions-refreshed', handleTransactionsRefreshed as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('transactions-refreshed', handleTransactionsRefreshed as EventListener);
    };
  }, [publicKey, companion.attributes]);
  
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
          {error?.includes("already synced") 
            ? "No more experience points for today!" 
            : (
                <>
                  You've earned <span className="text-[#ff6f61] font-bold">{experiencePoints} XP</span>
                </>
              )
          }
        </p>
        
        {experiencePoints > 0 && gameConfig && (
          <div className="mt-2">
            <p className="text-sm text-[#666]">
              Syncing will increase your companion&apos;s experience from {companion.experience} to {companion.experience + experiencePoints}.
              {calculateLevel(companion.experience + experiencePoints) > companion.level && 
                ` Your companion will level up to level ${calculateLevel(companion.experience + experiencePoints)}!`}
              {calculateEvolution(calculateLevel(companion.experience + experiencePoints)) > 
                calculateEvolution(companion.level) && 
                ` Your companion will evolve to stage ${calculateEvolution(calculateLevel(companion.experience + experiencePoints))}!`}
            </p>
          </div>
        )}
      </div>
      
      <button
        onClick={handleSyncProgress}
        disabled={isSyncing || experiencePoints === 0 || error?.includes("already synced")}
        className={`bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium py-2 px-6 rounded-lg transition duration-300 ease-in-out ${
          (isSyncing || experiencePoints === 0 || error?.includes("already synced")) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSyncing ? 'Syncing...' : 'Sync My Progress'}
      </button>

      <p className="text-sm text-[#666] italic">
        You can only sync your progress every 24 hours.
      </p>
      
      <p className="mt-4 text-sm text-[#666]">
        Last synced: {companion.attributes.find(attr => attr.trait_type === "LastUpdated")?.value ? 
          new Date(companion.attributes.find(attr => attr.trait_type === "LastUpdated")?.value as string).toLocaleString() : 
          'Never'}
      </p>
    </div>
  );
}; 