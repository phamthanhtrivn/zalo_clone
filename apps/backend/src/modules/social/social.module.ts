import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { Post, PostSchema, Comment, CommentSchema } from './schemas/post.schema';
import { StorageModule } from 'src/common/storage/storage.module';
import { SpotifyService } from './spotify.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Post.name, schema: PostSchema },
            { name: Comment.name, schema: CommentSchema },
        ]),
        StorageModule,
    ],
    controllers: [SocialController],
    providers: [SocialService, SpotifyService],
    exports: [SocialService],
})
export class SocialModule { }