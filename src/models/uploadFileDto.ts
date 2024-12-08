import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UploadFileDto {
  @ValidateIf((o) => o.password !== null && o.password !== '')
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Password must not exceed 30 characters.' })
  @ApiProperty({ example: 'PassW0rd', required: false })
  password?: string;

  @ValidateIf(
    (o) => o.expirationHours !== null && o.expirationHours !== undefined,
  )
  @IsOptional()
  @IsInt({ message: 'Expiration hours must be an integer.' })
  @Min(0, { message: 'Expiration hours must be at least 0.' })
  @ApiProperty({ example: 24, required: false })
  expirationHours?: number;

  @Transform(({ value }) => {   
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }) // Перетворення в булевий тип
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  toCompress?: boolean;
}
