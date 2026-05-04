import { IsOptional, IsString } from 'class-validator';

export class CreatePostDto {
    @IsOptional()
    @IsString()
    text?: string;

    @IsOptional()
    @IsString()
    visibility?: string;

    @IsOptional()
    location?: any;

    @IsOptional()
    music?: any;

    @IsOptional()
    taggedFriends?: any;

    @IsOptional()
    @IsString()
    fontStyle?: string;

    @IsOptional()
    @IsString()
    fontColor?: string;
}