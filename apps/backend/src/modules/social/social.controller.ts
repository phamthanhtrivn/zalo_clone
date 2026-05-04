import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Req,
    UploadedFiles,
    UseInterceptors,
    Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SocialService } from './social.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Public } from 'src/common/decorator/is-public.decorator';
@Controller('posts')
export class SocialController {
    constructor(private readonly socialService: SocialService) { }

    @Post()
    @UseInterceptors(FilesInterceptor('files'))
    createPost(
        @Req() req,
        @Body() dto: CreatePostDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {

        return this.socialService.createPost(req.user.userId, dto, files);
    }

    @Get('/feed')
    getFeed(@Req() req) {
        return this.socialService.getFeed(req.user.userId);
    }

    @Post('/:id/react')
    react(@Param('id') id: string, @Req() req, @Body('type') type: string) {
        return this.socialService.toggleReaction(id, req.user.userId, type);
    }

    @Post('/:id/comment')
    comment(@Param('id') id: string, @Req() req, @Body('content') content: string) {
        return this.socialService.addComment(id, req.user.userId, content);
    }

    @Get('/:id/comments')
    getComments(@Param('id') id: string) {
        return this.socialService.getComments(id);
    }
    @Public()
    @Get("search")
    search(@Query("q") q: string) {
        return this.socialService.searchTrack(q);
    }
}