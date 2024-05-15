import { ObjectId } from 'mongodb';
import { ConfigurationData } from '../../lib/Configuration';

export type Rules = ConfigurationData & {_id?: ObjectId, public?: boolean};
