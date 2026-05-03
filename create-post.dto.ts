import { IsString, IsOptional, IsEnum, IsMongoId } from 'class-validator';

export class CreatePostDto {
    @IsString()
    @IsOptional()
    text?: string;

    @IsEnum(['PUBLIC', 'FRIENDS', 'PRIVATE'])
    @IsOptional()
    visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

    @IsEnum(['USER', 'STORE'])
    @IsOptional()
    authorType?: 'USER' | 'STORE';

    @IsMongoId()
    @IsOptional()
    storeId?: string; // Bắt buộc nếu authorType là 'STORE'
}