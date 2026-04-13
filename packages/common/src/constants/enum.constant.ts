export const USER = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type UserTYPE = (typeof USER)[keyof typeof USER];
