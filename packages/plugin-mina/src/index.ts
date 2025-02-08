import {
  Field,
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
  fetchAccount,
  Signature,
} from 'o1js';
import { Plugin, Character } from '@elizaos/core';
import { CharacterContract } from './contracts/CharacterContract';
import { MemoryVerification } from './zk/MemoryVerification';
import {
  MinaPluginConfig,
  MinaContractState,
  CharacterStorage,
  MemoryData,
  MinaCharacterData,
  MinaMemoryData,
  MemoryUpdate,
  TransactionResult,
} from './types';

export class MinaPlugin implements Plugin {
  name = 'mina';
  private config: MinaPluginConfig;
  private state: MinaContractState | null = null;

  constructor(config: MinaPluginConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    const { networkUrl, deployerKey, network } = this.config.envConfig;

    // Initialize Mina instance
    const Network = Mina.Network(networkUrl);
    Mina.setActiveInstance(Network);

    // Set up deployer account
    const deployerPrivateKey = PrivateKey.fromBase58(deployerKey);
    const deployerPublicKey = deployerPrivateKey.toPublicKey();

    // Compile contracts
    await CharacterContract.compile();
    await MemoryVerification.compile();

    // Initialize contract state
    this.state = {
      contract: new CharacterContract(PublicKey.fromBase58(this.config.envConfig.contractAddress)),
      deployerKey: deployerPrivateKey,
      publicKey: deployerPublicKey,
    };

    // Initialize contract if needed
    const contractAccount = await fetchAccount({ publicKey: this.state.contract.address });
    if (!contractAccount.account) {
      await this.deployContract();
    }
  }

  private async deployContract(): Promise<void> {
    if (!this.state) throw new Error('Plugin not initialized');

    const txn = await Mina.transaction(this.state.publicKey, () => {
      AccountUpdate.fundNewAccount(this.state!.publicKey);
      this.state!.contract.deploy();
    });

    await txn.prove();
    await txn.sign([this.state.deployerKey]).send();
  }

  async storeCharacter(character: Character): Promise<TransactionResult> {
    if (!this.state) throw new Error('Plugin not initialized');

    try {
      // Convert character to storage format
      const storage: CharacterStorage = {
        name: Field.fromString(character.name),
        id: Field.fromString(character.id),
        memoryHash: Field(0), // Initial memory hash
        lastUpdated: Field(Date.now()),
        isVerified: Field(0),
        bio: character.bio.map(Field.fromString),
        lore: character.lore.map(Field.fromString),
        knowledge: character.knowledge.map(Field.fromString),
        style: {
          all: character.style.all.map(Field.fromString),
          chat: character.style.chat.map(Field.fromString),
          post: character.style.post.map(Field.fromString),
        },
      };

      // Create signature
      const signature = Signature.create(this.state.deployerKey, [
        storage.id,
        storage.name,
        storage.memoryHash,
        storage.lastUpdated,
      ]);

      // Store character on chain
      const txn = await Mina.transaction(this.state.publicKey, () => {
        this.state!.contract.storeCharacter(storage, signature);
      });

      await txn.prove();
      const hash = await txn.sign([this.state.deployerKey]).send();

      return { hash, success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { hash: '', success: false, error: errorMessage };
    }
  }

  async updateMemory(update: MemoryUpdate): Promise<TransactionResult> {
    if (!this.state) throw new Error('Plugin not initialized');

    try {
      // Create memory data
      const memory: MemoryData = {
        id: Field.fromString(crypto.randomUUID()),
        characterId: Field.fromString(update.characterId),
        content: Field(0), // Encrypted content hash
        timestamp: Field(Date.now()),
        hash: update.memoryHash,
        proof: update.proof,
        isVerified: Field(1),
        type: update.type,
        context: Field(0),
        associations: [],
      };

      // Create signature
      const signature = Signature.create(this.state.deployerKey, [
        memory.id,
        memory.characterId,
        memory.hash,
        memory.timestamp,
      ]);

      // Update memory on chain
      const txn = await Mina.transaction(this.state.publicKey, () => {
        this.state!.contract.updateMemory(memory.characterId, memory, signature);
      });

      await txn.prove();
      const hash = await txn.sign([this.state.deployerKey]).send();

      return { hash, success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { hash: '', success: false, error: errorMessage };
    }
  }

  async loadCharacter(characterId: string): Promise<MinaCharacterData | null> {
    if (!this.state) throw new Error('Plugin not initialized');

    try {
      const id = Field.fromString(characterId);
      const character = await this.state.contract.characters.get(id);

      if (!character) return null;

      return {
        id: characterId,
        name: character.name.toString(),
        memoryHash: character.memoryHash.toString(),
        lastUpdated: Number(character.lastUpdated.toString()),
        isVerified: Boolean(character.isVerified.toString()),
        bio: character.bio.map((f: Field) => f.toString()),
        lore: character.lore.map((f: Field) => f.toString()),
        knowledge: character.knowledge.map((f: Field) => f.toString()),
        style: {
          all: character.style.all.map((f: Field) => f.toString()),
          chat: character.style.chat.map((f: Field) => f.toString()),
          post: character.style.post.map((f: Field) => f.toString()),
        },
      };
    } catch (error: unknown) {
      console.error('Failed to load character:', error);
      return null;
    }
  }

  async loadMemory(characterId: string): Promise<MinaMemoryData[] | null> {
    if (!this.state) throw new Error('Plugin not initialized');

    try {
      const id = Field.fromString(characterId);
      const memories = await this.state.contract.memories.get(id);

      if (!memories) return null;

      return memories.map((memory: MemoryData) => ({
        id: memory.id.toString(),
        characterId: memory.characterId.toString(),
        content: memory.content.toString(),
        timestamp: Number(memory.timestamp.toString()),
        hash: memory.hash.toString(),
        proof: memory.proof.toString(),
        isVerified: Boolean(memory.isVerified.toString()),
        type: memory.type.toString(),
        context: memory.context.toString(),
        associations: memory.associations.map((f: Field) => f.toString()),
      }));
    } catch (error: unknown) {
      console.error('Failed to load memories:', error);
      return null;
    }
  }

  async transferTokens(to: string, amount: number): Promise<TransactionResult> {
    if (!this.state) throw new Error('Plugin not initialized');

    try {
      const toPublicKey = PublicKey.fromBase58(to);
      const txn = await Mina.transaction(this.state.publicKey, () => {
        this.state!.contract.transferTokens(toPublicKey, Field(amount));
      });

      await txn.prove();
      const hash = await txn.sign([this.state.deployerKey]).send();

      return { hash, success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { hash: '', success: false, error: errorMessage };
    }
  }
}

export function createMinaPlugin(config: MinaPluginConfig): Plugin | null {
  // Validate required environment variables
  const requiredEnvVars = [
    'networkUrl',
    'network',
    'deployerKey',
    'publicKey',
    'contractAddress',
    'defaultFee',
    'characterContractAddress',
    'memoryContractAddress',
    'proverUrl',
    'verificationKey'
  ] as const;

  type EnvKey = typeof requiredEnvVars[number];

  const missingVars = requiredEnvVars.filter(
    (key: EnvKey) => !config.envConfig[key]
  );

  if (missingVars.length > 0) {
    console.warn(
      `Mina plugin disabled. Missing required environment variables: ${missingVars.join(', ')}`
    );
    return null;
  }

  return new MinaPlugin(config);
}

export * from './types';
export * from './contracts/CharacterContract';
export * from './zk/MemoryVerification';