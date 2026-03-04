import { Injectable } from '@nestjs/common';
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

  createTestUser(body: any) {
    return this.userModel.create(body);
  }
}
