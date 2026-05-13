import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SocialNotification extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    actorUserId: Types.ObjectId;

    @Prop({
        required: true,
        enum: ['POST_COMMENT', 'POST_REACTION', 'STORY_REACTION', 'STORY_REPLY'],
    })
    type: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    body: string;

    @Prop({ default: '' })
    actorName: string;

    @Prop({ default: '' })
    actorAvatar: string;

    @Prop({ type: Types.ObjectId, ref: 'Post', default: null })
    postId?: Types.ObjectId | null;

    @Prop({ type: Types.ObjectId, ref: 'Post', default: null })
    storyId?: Types.ObjectId | null;

    @Prop({ type: Date, default: null })
    readAt?: Date | null;

    createdAt?: Date;
    updatedAt?: Date;
}

export const SocialNotificationSchema =
    SchemaFactory.createForClass(SocialNotification);
