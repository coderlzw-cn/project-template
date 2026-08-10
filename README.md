```bash
docker run -d --name mysql --restart unless-stopped -e TZ=Asia/Shanghai -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 mysql:8.4.0
```
