import { IsOptional, IsString, IsEnum } from 'class-validator';

export class CreatePostDto {
    @IsOptional()
    @IsString()
    text?: string;

    @IsOptional()
    @IsEnum(['PUBLIC', 'FRIENDS', 'PRIVATE'])
    visibility?: string;
}