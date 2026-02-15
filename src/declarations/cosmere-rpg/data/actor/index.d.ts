import { ActorType } from '@system/types/cosmere';
import { AdversaryActorDataModel } from './adversary';
import { CharacterActorDataModel } from './character';
import { CommonActorDataModel } from './common';
export declare const config: {
    readonly character: typeof CharacterActorDataModel;
    readonly adversary: typeof AdversaryActorDataModel;
};
export { CommonActorData, AttributeData }
