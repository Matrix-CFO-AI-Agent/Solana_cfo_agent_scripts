# 使用官方 Node.js 镜像
FROM node:23.3.0

# 创建工作目录
WORKDIR /app

# 拷贝依赖文件并安装依赖
# COPY package*.json ./
# RUN npm install

# 拷贝所有源码
# COPY . .

# 编译 TypeScript
# RUN npm run build

# 启动服务（如果是 ts-node-dev 可替换成 dev 命令）
# CMD ["npm","run", "start"]
