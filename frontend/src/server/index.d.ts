import 'express-session';
import type { ObjectId } from 'mongodb';

declare module 'express-session' {
  interface SessionData {
    review_id?: ObjectId;
    reviews?: ObjectId[];
  }
}
