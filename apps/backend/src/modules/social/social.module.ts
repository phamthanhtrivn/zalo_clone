import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { Post, PostSchema, Comment, CommentSchema } from './schemas/post.schema';
import { StorageModule } from 'src/common/storage/storage.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Post.name, schema: PostSchema },
            { name: Comment.name, schema: CommentSchema },
        ]),
        StorageModule,
    ],
    controllers: [SocialController],
    providers: [SocialService],
    exports: [SocialService],
})
export class SocialModule { }