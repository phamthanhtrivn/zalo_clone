import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

@Schema({ timestamps: true })
export class Poll extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;
  
  @Prop({
    type: [{
      _id: { type: Types.ObjectId, default: () => new Types.ObjectId() },
      text: { type: String, required: true },
      creatorId: { type: Types.ObjectId, ref: 'User' }
    }]
  })
  options: { _id: Types.ObjectId; text: string; creatorId: Types.ObjectId }[];

  @Prop({ default: true })
  isMultipleChoice: boolean;

  @Prop({ default: true })
  allowAddOptions: boolean;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ default: false })
  hideResultsUntilVoted: boolean;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;
}

export const PollSchema = SchemaFactory.createForClass(Poll);

PollSchema.index({ conversationId: 1, createdAt: -1 });