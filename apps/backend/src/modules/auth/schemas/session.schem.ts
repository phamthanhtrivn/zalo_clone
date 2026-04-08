import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  refreshToken: string; // hash

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  device?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// TTL index
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
