import {
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  Signature,
  Field,
  Bool,
  Circuit
} from 'o1js';
import { CharacterStorage, MemoryData } from '../types';

export class CharacterContract extends SmartContract {
  @state(Field) characterCount = State<Field>();
  @state(PublicKey) owner = State<PublicKey>();
  @state(Field) lastUpdateTime = State<Field>();

  // Character storage mapping (characterId => CharacterStorage)
  characters = new Map<Field, CharacterStorage>();

  // Memory storage mapping (characterId => MemoryData[])
  memories = new Map<Field, MemoryData[]>();

  events = {
    'character-stored': Field,
    'memory-updated': Field,
    'tokens-transferred': Field
  };

  @method init() {
    super.init();
    this.characterCount.set(Field(0));
    this.owner.set(this.sender);
    this.lastUpdateTime.set(Field(Date.now()));
  }

  @method storeCharacter(character: CharacterStorage, signature: Signature) {
    // Verify sender owns the character
    const validSender = this.sender.equals(this.owner.get());
    validSender.assertTrue('Only owner can store characters');

    // Verify signature
    const signedFields = [
      character.id,
      character.name,
      character.memoryHash,
      character.lastUpdated,
    ];
    const validSignature = signature.verify(this.sender, signedFields);
    validSignature.assertTrue('Invalid signature');

    // Store character data
    this.characters.set(character.id, character);

    // Update state
    const count = this.characterCount.get();
    this.characterCount.set(count.add(1));
    this.lastUpdateTime.set(Field(Date.now()));

    // Emit event
    this.emitEvent('CharacterStored', character);
  }

  @method updateMemory(
    characterId: Field,
    memory: MemoryData,
    signature: Signature
  ) {
    // Verify sender owns the character
    const character = this.characters.get(characterId);
    const validOwner = this.sender.equals(this.owner.get());
    validOwner.assertTrue('Only owner can update memory');

    // Verify signature
    const signedFields = [
      memory.id,
      memory.characterId,
      memory.hash,
      memory.timestamp,
    ];
    const validSignature = signature.verify(this.sender, signedFields);
    validSignature.assertTrue('Invalid signature');

    // Update character's memory
    let memories = this.memories.get(characterId) || [];
    memories.push(memory);
    this.memories.set(characterId, memories);

    // Update character's memory hash
    character.memoryHash = memory.hash;
    character.lastUpdated = Field(Date.now());
    this.characters.set(characterId, character);

    // Update state
    this.lastUpdateTime.set(Field(Date.now()));

    // Emit event
    this.emitEvent('MemoryUpdated', memory);
  }

  @method transferTokens(to: PublicKey, amount: Field) {
    // Verify sender is owner
    const validSender = this.sender.equals(this.owner.get());
    validSender.assertTrue('Only owner can transfer tokens');

    // Verify sufficient balance
    const validAmount = Circuit.if(
      amount.lessThanOrEqual(this.balance),
      Bool(true),
      Bool(false)
    );
    validAmount.assertTrue('Insufficient balance');

    // Transfer tokens
    this.send({ to, amount });

    // Emit event
    this.emitEvent('TokensTransferred', { to, amount });
  }

  @method changeOwner(newOwner: PublicKey) {
    // Verify current owner
    const validSender = this.sender.equals(this.owner.get());
    validSender.assertTrue('Only current owner can change ownership');

    // Update owner
    this.owner.set(newOwner);

    // Emit event
    this.emitEvent('OwnershipTransferred', {
      previousOwner: this.sender,
      newOwner
    });
  }
}