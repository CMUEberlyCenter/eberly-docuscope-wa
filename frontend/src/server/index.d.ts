import 'express-session';
import { ObjectId } from 'mongodb';

declare module 'express-session' {
  interface SessionData {
    review_id?: ObjectId;
    reviews?: ObjectId[];
  }
}
