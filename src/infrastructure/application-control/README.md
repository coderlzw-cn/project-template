# Application Control

`ApplicationControlModule` 封装当前 Nest 应用的运行状态、优雅停止和重启请求。

HTTP 接口仅允许系统管理员访问，并已写入 Swagger：

- `GET /api/v1/application-control/status`
- `POST /api/v1/application-control/stop`
- `POST /api/v1/application-control/restart`
- `GET /api/v1/application-control/environment-variables`
- `GET /api/v1/application-control/environment-variables/:name`
- `POST /api/v1/application-control/environment-variables`
- `PUT /api/v1/application-control/environment-variables/:name`
- `DELETE /api/v1/application-control/environment-variables/:name`

停止和重启接口先返回 `202 Accepted`，等 HTTP 响应发送完成后再执行应用关闭，避免调用方收到连接重置。

```ts
constructor(private readonly applicationControl: ApplicationControlService) {}

const status = this.applicationControl.getStatus();
await this.applicationControl.stop();
await this.applicationControl.restart();
```

`stop()` 默认以退出码 `0` 结束，`restart()` 默认以 `75` 结束。两者都会先调用 `app.close()` 执行 Nest 生命周期清理，清理超时则强制退出。

开发环境会启用 `terminateParentOnStop`：调用 `stop()` 后在 Nest 子进程关闭完成时，同时向 `pnpm dev` 的 Webpack watcher 父进程发送 `SIGTERM`，使开发命令完整退出。生产环境默认关闭该选项，避免影响 PM2、Docker 或其他守护进程。

环境变量接口只管理项目根目录的 `.env` 文件，保留未修改的配置、注释和顺序，并通过临时文件原子替换。修改后需要重启应用，已加载到 `process.env` 或 Nest Config 中的值才会刷新。密码、Token、密钥等敏感变量的查询结果统一返回 `********`。

重启必须由 PM2、Docker、systemd 或 Kubernetes 等外部守护程序完成。若守护策略配置为“无论退出码都重启”，`stop()` 也会被再次拉起；本项目的 PM2 与 Compose 配置已根据两个退出码区分停止和重启。

`getStatus()` 返回运行状态、PID、启动时间、运行时长、Node/平台信息和内存用量，不暴露环境变量内容或启动参数。
