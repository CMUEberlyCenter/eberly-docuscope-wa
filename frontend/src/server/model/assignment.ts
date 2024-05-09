import { ObjectId } from 'mongodb';

export type Assignment = {
     rules: ObjectId,
     assignment: string,
    // docuscope options
     docuscope?: boolean,
     coherence?: boolean,
     clarity?: boolean,
     impressions?: boolean,
    // scribe options
     scribe?: boolean,
     notes_to_prose?: boolean,
     grammar?: boolean,
     copyedit?: boolean,
     expectation?: boolean,
     text2speech?: boolean,
     logical_flow?: boolean,
     topics?: boolean,
     id?: ObjectId
}