import { SetMetadata } from '@nestjs/common';
import { Purpose } from 'src/modules/auth/dto/verify-otp.dto';

export const TMP_PURPOSE_KEY = 'tmp_purpose';

export const RequireTempPurpose = (purpose: Purpose) =>
  SetMetadata(TMP_PURPOSE_KEY, purpose);
