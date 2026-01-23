#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 获取脚本所在目录的父目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 收集项目
declare -a PROJECT_NAMES
INDEX=1
for dir in "$PROJECT_ROOT/apps"/* "$PROJECT_ROOT/packages"/*; do
  if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
    NAME=$(node -e "try { const pkg = require('$dir/package.json'); console.log(pkg.name || ''); } catch(e) {}" 2>/dev/null)
    if [ -n "$NAME" ]; then
      PROJECT_NAMES[$INDEX]="$NAME"
      ((INDEX++))
    fi
  fi
done

[ ${#PROJECT_NAMES[@]} -eq 0 ] && echo -e "${RED}未找到项目${NC}" && exit 1

# 保存终端设置
ORIGINAL_STTY=$(stty -g)

# 清理并退出备用屏幕的函数
cleanup() {
  stty "$ORIGINAL_STTY" 2>/dev/null
  # 退出备用屏幕，恢复主终端内容
  tput rmcup 2>/dev/null || printf "\033[?1049l"
}
trap cleanup EXIT

# 交互式菜单函数
show_menu() {
  local selected=$1
  local total=${#PROJECT_NAMES[@]}
  # 清除备用屏幕内容并重置光标
  printf "\033[2J\033[H\033[0m"
  printf "${YELLOW}=== pnpm Deploy 脚本 ===${NC}\r\n"
  printf "${BLUE}请选择要部署的项目 (使用 ↑↓ 箭头键选择，回车确认):${NC}\r\n\r\n"
  for i in $(seq 1 $total); do
    if [ $i -eq $selected ]; then
      printf "  ${GREEN}▶${NC} ${CYAN}${PROJECT_NAMES[$i]}${NC}\r\n"
    else
      printf "    ${PROJECT_NAMES[$i]}\r\n"
    fi
  done
}

# 开启备用屏幕
tput smcup 2>/dev/null || printf "\033[?1049h"

# 交互循环
SELECTED=1
show_menu $SELECTED
stty -echo raw
while true; do
  IFS= read -r -n 1 key
  if [ "$key" = $'\033' ]; then
    IFS= read -r -n 1 key2
    if [ "$key2" = '[' ]; then
      IFS= read -r -n 1 key3
      case "$key3" in
        'A') [ $SELECTED -gt 1 ] && ((SELECTED--)) && show_menu $SELECTED ;;
        'B') [ $SELECTED -lt ${#PROJECT_NAMES[@]} ] && ((SELECTED++)) && show_menu $SELECTED ;;
      esac
    fi
  elif [[ "$key" == $'\r' || "$key" == $'\n' || -z "$key" ]]; then
    break
  fi
done

# 退出循环后立即清理（触发 trap 或手动调用）
# 退出循环后立即清理
cleanup
trap - EXIT

PROJECT_NAME="${PROJECT_NAMES[$SELECTED]}"

# 在主终端显示最终选择
echo -e "${YELLOW}=== pnpm Deploy 脚本 ===${NC}"
echo "请选择项目: ${PROJECT_NAME}"

# 定义默认部署目录，解决之前提示为空且导致部署到根目录的问题
DEFAULT_DEPLOY_DIR="$(pwd)/deploy"

# 路径询问逻辑：增加默认值处理并统一格式
read -e -p "请输入目标目录路径 (默认: $DEFAULT_DEPLOY_DIR): " TARGET_DIR
TARGET_DIR="${TARGET_DIR:-$DEFAULT_DEPLOY_DIR}"

# 处理路径符号并显示部署配置（去重）
TARGET_DIR="${TARGET_DIR/#\~/$HOME}"
echo -e "\n${YELLOW}部署配置:${NC}"
echo -e "  项目名称: ${GREEN}$PROJECT_NAME${NC}"
echo -e "  目标目录: ${GREEN}$TARGET_DIR${NC}\n"

# 统一询问格式并修复 pnpm 命令
read -p "请确认是否执行部署 (y/N): " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo -e "\n${YELLOW}正在执行部署...${NC}\n"
  # 确保包含 deploy 关键字
  pnpm --filter="$PROJECT_NAME" --prod deploy "$TARGET_DIR"
fi
