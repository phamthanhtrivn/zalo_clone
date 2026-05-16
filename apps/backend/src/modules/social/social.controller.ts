import {
  Controller,
  Post,
  Get,
  Delete,
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
  constructor(private readonly socialService: SocialService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  createPost(
    @Req() req,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.socialService.createPost(req.user.userId, dto, files);
  }

  @Post('/video')
  @UseInterceptors(FilesInterceptor('files', 1))
  createVideoPost(
    @Req() req,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.socialService.createVideoPost(req.user.userId, dto, files);
  }

  @Post('/stories')
  @UseInterceptors(FilesInterceptor('files'))
  createStory(
    @Req() req,
    @Body() dto: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.socialService.createStory(req.user.userId, dto, files);
  }

  @Get('/stories')
  getStories(@Req() req) {
    return this.socialService.getStories(req.user.userId);
  }

  @Get('/notifications')
  getNotifications(@Req() req) {
    return this.socialService.getNotifications(req.user.userId);
  }

  @Post('/notifications/:id/read')
  markNotificationRead(@Param('id') id: string, @Req() req) {
    return this.socialService.markNotificationRead(id, req.user.userId);
  }

  @Public()
  @Get('/stories/music')
  getStoryMusic(@Query('q') q?: string) {
    return this.socialService.getStoryMusicSuggestions(q || '');
  }

  @Delete('/stories/:id')
  deleteStory(@Param('id') id: string, @Req() req) {
    return this.socialService.deleteStory(id, req.user.userId);
  }

  @Post('/stories/:id/view')
  markStoryViewed(@Param('id') id: string, @Req() req) {
    return this.socialService.markStoryViewed(id, req.user.userId);
  }

  @Get('/stories/:id/viewers')
  getStoryViewers(@Param('id') id: string, @Req() req) {
    return this.socialService.getStoryViewers(id, req.user.userId);
  }

  @Post('/stories/:id/react')
  reactStory(@Param('id') id: string, @Req() req, @Body('type') type: string) {
    return this.socialService.reactStory(id, req.user.userId, type);
  }

  @Post('/stories/:id/reply')
  replyStory(
    @Param('id') id: string,
    @Req() req,
    @Body('content') content: string,
  ) {
    return this.socialService.replyStory(id, req.user.userId, content);
  }

  @Get('/feed')
  getFeed(@Req() req) {
    return this.socialService.getFeed(req.user.userId);
  }

  @Get('/video-feed')
  getVideoFeed(
    @Req() req,
    @Query('category') category?: string,
    @Query('feedType') feedType?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.socialService.getVideoFeed(
      req.user.userId,
      category,
      feedType,
      authorId,
    );
  }

  @Get('/video-profile')
  getVideoProfile(@Req() req, @Query('userId') userId?: string) {
    return this.socialService.getVideoProfile(req.user.userId, userId);
  }

  @Post('/video-profile/follow/:userId')
  followVideoCreator(@Req() req, @Param('userId') userId: string) {
    return this.socialService.followVideoCreator(req.user.userId, userId);
  }

  @Delete('/video-profile/follow/:userId')
  unfollowVideoCreator(@Req() req, @Param('userId') userId: string) {
    return this.socialService.unfollowVideoCreator(req.user.userId, userId);
  }

  @Get('/detail/:id')
  getPostDetail(@Param('id') id: string, @Req() req) {
    return this.socialService.getPostDetail(id, req.user.userId);
  }

  @Delete('/:id')
  deletePost(@Param('id') id: string, @Req() req) {
    return this.socialService.deletePost(id, req.user.userId);
  }

  @Post('/:id/visibility')
  updatePostVisibility(
    @Param('id') id: string,
    @Req() req,
    @Body('visibility') visibility: string,
  ) {
    return this.socialService.updatePostVisibility(
      id,
      req.user.userId,
      visibility,
    );
  }

  @Post('/:id/hide-author')
  hideAuthor(@Param('id') id: string, @Req() req) {
    return this.socialService.hideAuthorFromFeed(id, req.user.userId);
  }

  @Post('/:id/block-viewer')
  blockViewer(@Param('id') id: string, @Req() req) {
    return this.socialService.blockDiaryViewer(id, req.user.userId);
  }

  @Post('/:id/report')
  reportPost(
    @Param('id') id: string,
    @Req() req,
    @Body('reason') reason?: string,
  ) {
    return this.socialService.reportPost(id, req.user.userId, reason);
  }

  @Post('/:id/react')
  react(@Param('id') id: string, @Req() req, @Body('type') type: string) {
    return this.socialService.toggleReaction(id, req.user.userId, type);
  }

  @Post('/:id/share')
  sharePost(@Param('id') id: string, @Req() req) {
    return this.socialService.incrementShareCount(id, req.user.userId);
  }

  /** Thêm bình luận gốc hoặc reply (khi truyền parentId) */
  @Post('/:id/comment')
  comment(
    @Param('id') id: string,
    @Req() req,
    @Body('content') content: string,
    @Body('parentId') parentId?: string,
  ) {
    return this.socialService.addComment(
      id,
      req.user.userId,
      content,
      parentId,
    );
  }

  /** Lấy bình luận – lọc chỉ hiện bình luận của bạn bè viewerId */
  @Get('/:id/comments')
  getComments(@Param('id') id: string, @Req() req) {
    return this.socialService.getComments(id, req.user.userId);
  }

  /** Xoá bình luận của chính mình */
  @Delete('/comments/:commentId')
  deleteComment(@Param('commentId') commentId: string, @Req() req) {
    return this.socialService.deleteComment(commentId, req.user.userId);
  }

  @Public()
  @Get('search')
  search(@Query('q') q: string) {
    return this.socialService.searchTrack(q);
  }
}
