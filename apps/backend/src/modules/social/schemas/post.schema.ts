import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class MediaItem {
    @Prop({ required: true })
    url: string;

    @Prop({ enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' })
    type: string;
}

@Schema({ _id: false })
class PostReportItem {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ default: '' })
    reason?: string;

    @Prop({ type: Date, default: Date.now })
    createdAt?: Date;
}

@Schema({ timestamps: true })
export class Post extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    authorId: Types.ObjectId;

    @Prop({ enum: ['USER', 'STORE'], default: 'USER' })
    authorType: string;

    @Prop({
        type: {
            text: String,
            media: [SchemaFactory.createForClass(MediaItem)],
        },
    })
    content: {
        text?: string;
        media: MediaItem[];
    };

    @Prop({ enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'], default: 'PUBLIC' })
    visibility: string;

    @Prop({
        type: [
            {
                userId: { type: Types.ObjectId, ref: 'User' },
                type: { type: String, enum: ['LIKE', 'HEART', 'HAHA', 'SAD'], default: 'LIKE' },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    })
    reactions: any[];

    @Prop({ type: [SchemaFactory.createForClass(PostReportItem)], default: [] })
    reports?: PostReportItem[];

    @Prop({ default: 0 })
    commentCount: number;
    @Prop({ type: Object })
    location?: any;

    @Prop({ type: Object })
    music?: any;

    @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
    taggedFriends?: Types.ObjectId[];

    @Prop()
    fontStyle?: string;

    @Prop()
    fontColor?: string;

    createdAt?: Date;
    updatedAt?: Date;

    @Prop({ enum: ['POST', 'STORY'], default: 'POST', index: true })
    postType?: string;

    @Prop({ type: Date, default: null, index: true })
    expiresAt?: Date | null;

    @Prop({
        type: {
            mode: { type: String, enum: ['friends', 'include', 'exclude'], default: 'friends' },
            includeUserIds: [{ type: Types.ObjectId, ref: 'User' }],
            excludeUserIds: [{ type: Types.ObjectId, ref: 'User' }],
        },
        default: null,
    })
    storyPrivacy?: {
        mode: 'friends' | 'include' | 'exclude';
        includeUserIds?: Types.ObjectId[];
        excludeUserIds?: Types.ObjectId[];
    } | null;

    @Prop({
        type: [
            {
                userId: { type: Types.ObjectId, ref: 'User' },
                viewedAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    })
    storyViews?: Array<{ userId: Types.ObjectId; viewedAt: Date }>;

    @Prop({
        type: [
            {
                userId: { type: Types.ObjectId, ref: 'User' },
                type: { type: String, enum: ['LIKE', 'HEART', 'HAHA', 'WOW', 'SAD'], default: 'LIKE' },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    })
    storyReactions?: Array<{ userId: Types.ObjectId; type: string; createdAt: Date }>;

    @Prop({
        type: [
            {
                userId: { type: Types.ObjectId, ref: 'User' },
                content: { type: String },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    })
    storyReplies?: Array<{ userId: Types.ObjectId; content: string; createdAt: Date }>;
}

@Schema({ timestamps: true })
export class Comment extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
    postId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    content: string;

    @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
    parentId: Types.ObjectId;
}

export const PostSchema = SchemaFactory.createForClass(Post);
export const CommentSchema = SchemaFactory.createForClass(Comment);
