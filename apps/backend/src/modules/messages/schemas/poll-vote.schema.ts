import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

@Schema({ timestamps: true })
export class PollVote extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Poll', required: true })
  pollId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  optionId: Types.ObjectId;
}

export const PollVoteSchema = SchemaFactory.createForClass(PollVote);

// 1. Compound Index: Giúp tính toán kết quả poll cực nhanh
// 2. Unique: Ngăn chặn việc 1 user vote 1 phương án 2 lần
PollVoteSchema.index({ pollId: 1, userId: 1, optionId: 1 }, { unique: true });