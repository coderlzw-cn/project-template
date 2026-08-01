import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { authJwtConfig } from '../../config/jwt.config';
import { AuthService } from './auth.service';
import { AuthEnabledGuard } from './guard/auth-enabled.guard';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RolesGuard } from './guard/roles.guard';
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
    AuthEnabledGuard,
    LocalStrategy,
    JwtStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    // 角色守卫必须注册在 JwtAuthGuard 之后，执行时 request.user 才已就绪
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
