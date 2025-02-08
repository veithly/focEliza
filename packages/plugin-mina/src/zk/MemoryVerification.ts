import {
  Field,
  ZkProgram,
  SelfProof,
  Struct,
  Bool,
  Circuit,
} from 'o1js';

export class MemoryInput extends Struct({
  hash: Field,
  timestamp: Field,
  characterId: Field,
}) {
  static from(hash: Field, timestamp: Field, characterId: Field) {
    return new MemoryInput({ hash, timestamp, characterId });
  }
}

export const MemoryVerification = ZkProgram({
  name: 'MemoryVerification',
  publicInput: MemoryInput,

  methods: {
    verify: {
      privateInputs: [],

      method(input: MemoryInput) {
        // Verify memory hash is within valid range
        const validRange = Circuit.if(
          input.hash.greaterThan(Field(0)),
          Bool(true),
          Bool(false)
        );
        validRange.assertTrue('Memory hash must be greater than 0');

        // Verify timestamp is valid (not in future)
        const currentTime = Field(Date.now());
        const validTime = Circuit.if(
          input.timestamp.lessThanOrEqual(currentTime),
          Bool(true),
          Bool(false)
        );
        validTime.assertTrue('Timestamp cannot be in future');

        // Verify character ID exists
        const validCharacter = Circuit.if(
          input.characterId.greaterThan(Field(0)),
          Bool(true),
          Bool(false)
        );
        validCharacter.assertTrue('Invalid character ID');
      },
    },

    verifyRange: {
      privateInputs: [SelfProof],

      method(input: MemoryInput, previousProof: SelfProof<MemoryInput, void>) {
        // Verify previous proof
        previousProof.verify();

        // Verify memory hash is within valid range relative to previous
        const validRange = Circuit.if(
          input.hash.greaterThan(previousProof.publicInput.hash),
          Bool(true),
          Bool(false)
        );
        validRange.assertTrue('Memory hash must be greater than previous');

        // Verify timestamp is after previous
        const validTime = Circuit.if(
          input.timestamp.greaterThan(previousProof.publicInput.timestamp),
          Bool(true),
          Bool(false)
        );
        validTime.assertTrue('Timestamp must be after previous');

        // Verify same character
        const sameCharacter = Circuit.if(
          input.characterId.equals(previousProof.publicInput.characterId),
          Bool(true),
          Bool(false)
        );
        sameCharacter.assertTrue('Must be same character');
      },
    },
  },
});