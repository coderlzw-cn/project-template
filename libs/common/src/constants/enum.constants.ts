export const BusinessErrorCode = {
  USER_DISABLED: 20001,
  INSUFFICIENT_BALANCE: 30001,
  TOKEN_EXPIRED: 40001,
  PERMISSION_DENIED: 40003,
};

export type BusinessErrorCodeType = (typeof BusinessErrorCode)[keyof typeof BusinessErrorCode];
