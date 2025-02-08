import { Field, PublicKey, PrivateKey } from 'o1js';
import { Character } from '@elizaos/core';

export interface MinaEnvConfig {
  networkUrl: string;
  network: 'berkeley' | 'mainnet';
  deployerKey: string;
  publicKey: string;
  contractAddress: string;
  defaultFee: number;
  characterContractAddress: string;
  memoryContractAddress: string;
  proverUrl: string;
  verificationKey: string;
}

export interface MinaPluginConfig {
  envConfig: MinaEnvConfig;
}

export interface MinaContractState {
  contract: any;
  deployerKey: PrivateKey;
  publicKey: PublicKey;
}

export interface CharacterStorage {
  name: Field;
  id: Field;
  memoryHash: Field;
  lastUpdated: Field;
  isVerified: Field;
  bio: Field[];
  lore: Field[];
  knowledge: Field[];
  style: {
    all: Field[];
    chat: Field[];
    post: Field[];
  };
}

export interface MemoryData {
  id: Field;
  characterId: Field;
  content: Field;
  timestamp: Field;
  hash: Field;
  proof: Field;
  isVerified: Field;
  type: Field; // short-term, long-term, etc.
  context: Field;
  associations: Field[];
}

export interface MemoryUpdate {
  characterId: string;
  memoryHash: Field;
  proof: Field;
  timestamp: Field;
  type: Field;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

export interface MinaCharacterData {
  id: string;
  name: string;
  memoryHash: string;
  lastUpdated: number;
  isVerified: boolean;
  bio: string[];
  lore: string[];
  knowledge: string[];
  style: {
    all: string[];
    chat: string[];
    post: string[];
  };
}

export interface MinaMemoryData {
  id: string;
  characterId: string;
  content: string;
  timestamp: number;
  hash: string;
  proof: string;
  isVerified: boolean;
  type: string;
  context: string;
  associations: string[];
}