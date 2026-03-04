import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RequestFriendDto } from './dto/request-friend.dto';
import { SearchFriendDto } from './dto/search-friend.dto';
import { InforUser } from './dto/infor-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('test')
  createTest(@Body() body: any) {
    return this.usersService.createTestUser(body);
  }
  @Post('add-friend')
  addFriend(@Body() body: RequestFriendDto) {
    return this.usersService.addFriend(body);
  }
  @Post('accept-friend')
  acceptFriend(@Body() body: RequestFriendDto) {
    return this.usersService.acceptFriend(body);
  }
  @Post('reject-friend')
  rejectFriend(@Body() body: RequestFriendDto) {
    return this.usersService.rejectFriend(body);
  }
  @Post('block-friend')
  blockFriend(@Body() body: RequestFriendDto) {
    return this.usersService.blockFriend(body);
  }
  // hủy hoặc thu hồi kb
  @Post('cancel-friend')
  cancelFriend(@Body() body: RequestFriendDto) {
    return this.usersService.cancelFriend(body);
  }
  // theo tên người đã kb
  // theo std
  @Post('search-friend')
  searchFriend(@Body() body: SearchFriendDto) {
    return this.usersService.searchFriend(body);
  }
  @Patch('update-information-user/:id')
  @UseInterceptors(FileInterceptor('avatar'))
  updateInformationUser(
    @Param('id') id: string,
    @Body() body: InforUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log(body);
    return this.usersService.updateInformationUser(body, file, id);
  }
  @Post('suggest-friend/:userId')
  suggestFriend(@Param('userId') userId: string) {
    return this.usersService.suggestFriend(userId);
  }
}
