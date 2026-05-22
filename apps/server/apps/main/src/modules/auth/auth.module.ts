import { Module } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConfig } from '../../config/app.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [jwtConfig.KEY],
      useFactory: (jwtConfiguration: ConfigType<typeof jwtConfig>) => {
        return {
          // 私钥用于签名（Auth 服务）
          privateKey: jwtConfiguration.privateKey,
          // 公钥用于校验（其他服务或 Auth 服务自身）
          publicKey: jwtConfiguration.publicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: jwtConfiguration.expiresIn,
            // 建议包含发行人（iss）和受众（aud）校验
            issuer: 'main',
            audience: 'main',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
})
export class AuthModule {}
