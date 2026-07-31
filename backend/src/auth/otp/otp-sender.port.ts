export const OTP_SENDER = 'OTP_SENDER';

// Africa's Talking is the concrete implementation; local/dev uses a
// console/log sender instead (see specs/constitution.md's adapter rule).
export interface OtpSenderPort {
  send(phoneNumber: string, code: string): Promise<void>;
}
