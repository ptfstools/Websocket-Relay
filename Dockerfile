FROM node:20-alpine
WORKDIR /app
COPY index.js .
RUN npm install ws
RUN npm audit fix --force
EXPOSE 8080
CMD ["node", "index.js"]
