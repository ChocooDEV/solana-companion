import { NextResponse } from 'next/server';

// Define the game configuration
const gameConfig = {
  // XP needed for each level (index = level, value = total XP needed)
  levelThresholds: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300],
  
  // Level thresholds for each evolution
  evolutionThresholds: [0, 1, 3, 6, 9],
  
  companionImages: {
    "fluffy": [
      "/companions/fluffy_0.png",
      "/companions/fluffy_1.png",
      "/companions/fluffy_2.png"
    ],
    "sparky": [
      "/companions/sparky_0.png",
      "/companions/sparky_1.png",
      "/companions/sparky_2.png"
    ],
    "ember": [
      "/companions/ember_0.png",
      "/companions/ember_1.png",
      "/companions/ember_2.png"
    ]
  }
};

export async function GET() {
  return NextResponse.json(gameConfig);
} 