export interface Companion {
  name: string;
  dateOfBirth: string;
  image: string;
  description: string;
  experience: number;
  level: number;
  evolution: number;
  mood: string;
  attributes: CompanionAttribute[];
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