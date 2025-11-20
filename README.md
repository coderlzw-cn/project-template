在正在运行的容器中执行命令。

# 用法

```bash
docker container exec [OPTIONS] CONTAINER COMMAND [ARG...]
```

## 别名

别名是较长命令的简短或易于记忆的替代形式。

- `docker exec`

## 引入 Docker Debug

为了更轻松地进入任意容器进行调试，请使用 `docker debug`。
Docker Debug 是 `docker exec` 调试方式的替代方案。借助它，你可以进入任意容器或镜像（即使是精简版镜像），无需对容器做任何修改。此外，你还可以通过其可定制的工具箱携带自己喜爱的调试工具。

[立即体验 Docker Debug](https://docs.docker.com/debug/)

`docker exec` 命令会在一个正在运行的容器内运行一个新的命令。

通过 `docker exec` 指定的命令仅在容器的主进程（PID 1）运行期间有效；如果容器重启，该命令不会自动重新启动。

命令将在容器创建时设置的默认工作目录中执行。

**注意**：命令必须是一个可执行程序。链式命令或带引号的复合命令无法直接运行。

✅ 有效示例：

```bash
docker exec -it my_container sh -c "echo a && echo b"
```

❌ 无效示例：

```bash
docker exec -it my_container "echo a && echo b"
```

# 选项

| 选项 | 默认值 | 描述 |
| - | | |
| `-d, --detach` | | 后台模式：在后台运行命令 |
| `--detach-keys` | | 覆盖用于分离容器的键序列 |
| `-e, --env` | | **API 1.25+** 设置环境变量 |
| `--env-file` | | **API 1.25+** 从文件中读取环境变量 |
| `-i, --interactive` | | 即使未连接，也保持 STDIN 打开 |
| `--privileged` | | 为命令授予扩展权限 |
| `-t, --tty` | | 分配一个伪 TTY |
| `-u, --user` | | 用户名或 UID（格式：<name\|uid>[:<group\|gid>]） |
| `-w, --workdir` | | **API 1.35+** 容器内的工作目录 |

# 示例

## 在运行中的容器上执行 `docker exec`

首先，启动一个容器：

```bash
$ docker run --name mycontainer -d -i -t alpine /bin/sh
```

此命令基于 `alpine` 镜像创建并启动一个名为 `mycontainer` 的容器，主进程为 `sh` shell。

- `-d`（即 `--detach`）使容器在后台运行；
- `-t` 分配一个伪 TTY；
- `-i` 保持 STDIN 打开，防止 `sh` 进程立即退出。

接着，在该容器中执行命令：

```bash
$ docker exec -d mycontainer touch /tmp/execWorks
```

此命令在 `mycontainer` 容器后台创建一个 `/tmp/execWorks` 文件。

再启动一个交互式 shell：

```bash
$ docker exec -it mycontainer sh
```

这将在 `mycontainer` 中启动一个新的交互式 shell 会话。

## 为 exec 进程设置环境变量（`--env`, `-e`）

`docker exec` 会继承容器创建时设置的环境变量。
使用 `--env`（或 `-e`）可以覆盖全局环境变量，或为本次执行的进程设置额外的环境变量。

这些变量仅对由 `docker exec` 启动的进程有效，不会影响容器内其他进程。

示例：

```bash
$ docker exec -e VAR_A=1 -e VAR_B=2 mycontainer env
```

输出：

```
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOSTNAME=f64a4851eb71
VAR_A=1
VAR_B=2
HOME=/root
```

## 提升容器权限（`--privileged`）

使用 `--privileged` 可为 exec 命令授予扩展的系统权限（类似于容器启动时使用 `--privileged`）。
详情请参阅 [`docker run --privileged`](https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities)。

## 设置 exec 进程的工作目录（`--workdir`, `-w`）

默认情况下，`docker exec` 在容器创建时指定的工作目录中运行命令。

查看当前工作目录：

```bash
$ docker exec -it mycontainer pwd
/
```

使用 `-w` 指定其他工作目录：

```bash
$ docker exec -it -w /root mycontainer pwd
/root
```

### 尝试在已暂停的容器上运行 `docker exec`

如果容器处于暂停状态，`docker exec` 会失败并报错：

```bash
$ docker pause mycontainer
mycontainer

$ docker ps
CONTAINER ID   IMAGE     COMMAND      CREATED          STATUS                     NAMES
482efdf39fac   alpine    "/bin/sh"    17 seconds ago   Up 16 seconds (Paused)     mycontainer

$ docker exec mycontainer sh
Error response from daemon: Container mycontainer is paused, unpause the container before exec

$ echo $?
1
```

必须先使用 `docker unpause` 恢复容器，才能执行 `exec`。
