export interface Companion {
  name: string;
  description?: string;
  image: string;
  dateOfBirth: string;
  level: number;
  experience: number;
  evolution: number;
  mood: string;
  lastUpdated?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface CompanionAttribute {
  trait_type: string;
  value: string | number;
}

export interface CompanionChoice {
  id: number;
  name: string;
  image: string;
  description: string;
} 