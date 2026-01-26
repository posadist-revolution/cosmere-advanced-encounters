import { ActorType } from '@system/types/cosmere';

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    interface DataModelConfig {
        Actor: {
            'base': typeof CommonActorDataModel;
            [ActorType.Character]: typeof CharacterActorDataModel,
            [ActorType.Adversary]: typeof AdversaryActorDataModel
        }
    }
}