import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  refreshToken!: string; // hash

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ required: true, index: true })
  deviceId!: string;

  @Prop({ required: true })
  deviceName!: string;

  @Prop({ required: true })
  deviceType!: string;

  @Prop()
  ip?: string;

  @Prop()
  location?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// TTL index
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
