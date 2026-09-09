import { Roles } from '@/decorators/roles.decorator';
import { UserRole } from '@/generated/prisma/enums';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Res } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  ApplicationControlActionResponseDto,
  ApplicationStatusResponseDto,
  CreateEnvironmentVariableDto,
  DeleteEnvironmentVariableResponseDto,
  EnvironmentVariableParamDto,
  ProjectEnvironmentVariableListResponseDto,
  ProjectEnvironmentVariableResponseDto,
  UpdateEnvironmentVariableDto,
} from './application-control.dto';
import { ApplicationControlService } from './application-control.service';

@ApiTags('应用控制')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: '未登录或访问令牌无效' })
@ApiForbiddenResponse({ description: '仅系统管理员可执行应用控制' })
@Roles(UserRole.ADMIN)
@Controller('application-control')
export class ApplicationControlController {
  constructor(private readonly applicationControl: ApplicationControlService) {}

  @Get('status')
  @ApiOperation({ summary: '查询当前应用实例状态' })
  @ApiOkResponse({ type: ApplicationStatusResponseDto })
  status() {
    return this.applicationControl.getStatus();
  }

  @Get('environment-variables')
  @ApiOperation({ summary: '查询项目 .env 中的全部环境变量（敏感值脱敏）' })
  @ApiOkResponse({ type: ProjectEnvironmentVariableListResponseDto })
  environmentVariables() {
    return this.applicationControl.getEnvironmentVariables();
  }

  @Get('environment-variables/:name')
  @ApiOperation({ summary: '查询项目 .env 中的单个环境变量（敏感值脱敏）' })
  @ApiOkResponse({ type: ProjectEnvironmentVariableResponseDto })
  environmentVariable(@Param() params: EnvironmentVariableParamDto) {
    return this.applicationControl.getEnvironmentVariable(params.name);
  }

  @Post('environment-variables')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '向项目 .env 新增环境变量' })
  @ApiOkResponse({ type: ProjectEnvironmentVariableResponseDto })
  createEnvironmentVariable(@Body() body: CreateEnvironmentVariableDto) {
    return this.applicationControl.createEnvironmentVariable(body.name, body.value);
  }

  @Put('environment-variables/:name')
  @ApiOperation({ summary: '更新项目 .env 中的环境变量' })
  @ApiOkResponse({ type: ProjectEnvironmentVariableResponseDto })
  updateEnvironmentVariable(@Param() params: EnvironmentVariableParamDto, @Body() body: UpdateEnvironmentVariableDto) {
    return this.applicationControl.updateEnvironmentVariable(params.name, body.value);
  }

  @Delete('environment-variables/:name')
  @ApiOperation({ summary: '删除项目 .env 中的环境变量' })
  @ApiOkResponse({ type: DeleteEnvironmentVariableResponseDto })
  deleteEnvironmentVariable(@Param() params: EnvironmentVariableParamDto) {
    return this.applicationControl.deleteEnvironmentVariable(params.name);
  }

  @Post('stop')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '优雅停止当前应用实例' })
  @ApiAcceptedResponse({ type: ApplicationControlActionResponseDto, description: '停止请求已接受' })
  stop(@Res({ passthrough: true }) response: Response) {
    // 等确认响应完整发送后再关闭 HTTP 服务，避免调用方收到连接重置。
    response.once('finish', () => void this.applicationControl.stop());
    return { action: 'stop', accepted: true } as const;
  }

  @Post('restart')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '优雅重启当前应用实例' })
  @ApiAcceptedResponse({ type: ApplicationControlActionResponseDto, description: '重启请求已接受' })
  restart(@Res({ passthrough: true }) response: Response) {
    response.once('finish', () => void this.applicationControl.restart());
    return { action: 'restart', accepted: true } as const;
  }
}
