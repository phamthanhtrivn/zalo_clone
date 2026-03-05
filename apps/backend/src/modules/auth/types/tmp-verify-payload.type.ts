import { Purpose } from '../dto/verify-otp.dto';

export interface TempVerifyPayload {
  phone: string;
  purpose: Purpose;
  type: 'temp_verify';
  userId?: string; // Optional
}
