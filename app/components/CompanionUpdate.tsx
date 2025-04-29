'use client';

import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Companion } from '../types/companion';
import { updateCompanionData } from '../utils/updateUtils';

interface CompanionUpdateProps {
  companion: Companion;
  mintAddress: string;
  onUpdate: (updatedCompanion: Companion) => void;
}

export const CompanionUpdate: FC<CompanionUpdateProps> = ({ 
  companion, 
  mintAddress, 
  onUpdate 
}) => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [experience, setExperience] = useState(companion.experience);
  const [level, setLevel] = useState(companion.level);
  const [evolution, setEvolution] = useState(companion.evolution);

  const handleUpdate = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      // Create updated companion data
      const updatedCompanion: Companion = {
        ...companion,
        experience,
        level,
        evolution
      };

      // Update the data on Irys and update the NFT
      const result = await updateCompanionData(wallet, mintAddress, updatedCompanion);

      if (result.success) {
        setSuccess('Companion data updated successfully!');
        onUpdate(updatedCompanion);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to update companion data. Please try again.');
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md mt-4">
      <h3 className="text-xl font-bold text-[#333] mb-4">Update Companion</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-[#555] mb-1">
            Experience
          </label>
          <input
            type="number"
            value={experience}
            onChange={(e) => setExperience(Number(e.target.value))}
            min="0"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff6f61] focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[#555] mb-1">
            Level
          </label>
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            min="0"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff6f61] focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[#555] mb-1">
            Evolution
          </label>
          <input
            type="number"
            value={evolution}
            onChange={(e) => setEvolution(Number(e.target.value))}
            min="0"
            max="3"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff6f61] focus:border-transparent"
          />
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}
      
      <button
        onClick={handleUpdate}
        disabled={isUpdating}
        className={`bg-[#ff6f61] hover:bg-[#ff4f41] text-white font-medium py-2 px-4 rounded-lg transition duration-300 ease-in-out ${
          isUpdating ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isUpdating ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Updating...
          </div>
        ) : (
          'Update Companion'
        )}
      </button>
      
      <p className="mt-3 text-xs text-[#666]">
        Note: Updating requires SOL for transaction fees and storage costs.
      </p>
    </div>
  );
}; 