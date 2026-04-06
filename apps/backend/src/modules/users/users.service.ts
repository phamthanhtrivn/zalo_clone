import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { Gender } from '@zalo-clone/shared-types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByPhone(phone: string) {
    return this.userModel.findOne({ phone: phone }).exec();
  }

  async findById(userId: string) {
    return this.userModel.findById(userId);
  }

  async createRegister(
    phone: string,
    name: string,
    gender: Gender,
    birthday: Date,
    pass: string,
  ) {
    const password = await bcrypt.hash(pass, 10);
    const profile = {
      name,
      gender,
      birthday,
    };

    return this.userModel.create({
      phone,
      profile,
      password,
    });
  }

  async checkMatchPassword(
    phone: string,
    oldPassword: string,
  ): Promise<boolean> {
    const user = await this.userModel.findOne({ phone });
    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      throw new BadRequestException([
        { field: 'oldPassword', error: 'Mật khẩu cũ không chính xác!' },
      ]);
    }
    return true;
  }

  async updatePassword(phone: string, password: string) {
    const hashedPass = await bcrypt.hash(password, 10);

    return await this.userModel.updateOne(
      { phone },
      { $set: { password: hashedPass } },
    );
  }

  createTestUser(body: any) {
    return this.userModel.create(body);
  }
}
