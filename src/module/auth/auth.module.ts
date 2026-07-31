import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { authJwtConfig } from './jwt.config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtStrategy } from './strategy/jwt.strategy';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { LocalStrategy } from './strategy/local.strategy';

@Module({
  imports: [
    ConfigModule.forFeature(authJwtConfig),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(authJwtConfig)],
      inject: [authJwtConfig.KEY],
      useFactory: (config: ConfigType<typeof authJwtConfig>) => ({
        privateKey: config.privateKey,
        publicKey: config.publicKey,

        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.accessTtlSeconds,
          issuer: config.issuer,
          audience: config.audience,
        },

        verifyOptions: {
          algorithms: ['RS256'],
          issuer: config.issuer,
          audience: config.audience,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
