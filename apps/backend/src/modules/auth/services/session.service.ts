import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Session } from '../schemas/session.schem';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
  ) {}

  async create(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    device?: string,
  ) {
    const userObjectId = new Types.ObjectId(userId);
    return await this.sessionModel.create({
      userId: userObjectId,
      refreshToken,
      expiresAt,
      device,
    });
  }

  async findValidSession(userId: string, refreshToken: string) {
    const userObjectId = new Types.ObjectId(userId);
    const sessions = await this.sessionModel.find({
      userId: userObjectId,
    });

    for (const session of sessions) {
      console.log(session.refreshToken);
      const match = await bcrypt.compare(refreshToken, session.refreshToken);
      if (match) {
        return session;
      }
    }
    return null;
  }

  async remove(userId: string, refreshToken: string) {
    const sessions = await this.sessionModel.find({
      userId: new Types.ObjectId(userId),
    });

    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshToken)) {
        await this.sessionModel.deleteOne({ _id: session._id });
        return true;
      }
    }
    return false;
  }
  async removeByDevice(userId: string, device: string) {
    const userObjectId = new Types.ObjectId(userId);
    await this.sessionModel.deleteMany({ userId: userObjectId, device });
  }
}
