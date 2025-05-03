import { NextResponse } from 'next/server';

// Game configuration for levels and evolutions
export const gameConfig = {
  // XP needed for each level (index = level, value = total XP needed)
  levelThresholds: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300],
  
  // Level thresholds for each evolution
  evolutionThresholds: [0, 1, 3, 6, 9]
};

export async function GET() {
  return NextResponse.json(gameConfig);
} 