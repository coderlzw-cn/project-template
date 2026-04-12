```bash
# 生成一个 2048 位的 RSA 私钥：
openssl genrsa -out private.key 2048
# 从私钥中提取公钥 (Public Key)
openssl rsa -in private.key -pubout -out public.key
```
