```bash
docker run -d --name mysql --restart unless-stopped -e TZ=Asia/Shanghai -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 mysql:8.4.7
```

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
chmod 600 private.pem
chmod 644 public.pem
```
