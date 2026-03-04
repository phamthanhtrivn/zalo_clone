import { IsMongoId } from 'class-validator';

export class GetMediasPreviewDto {
  @IsMongoId()
  userId: string;
}
