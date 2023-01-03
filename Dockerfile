FROM node:18

ENV NODE_NAME nodename

ARG NPM_TOKEN
WORKDIR /app
RUN mkdir logs


COPY .npmrc_dummy .npmrc
COPY package.json /app

# Creating tar of productions dependencies
RUN npm install
RUN rm -f .npmrc

# Copying application code
COPY . /app

CMD npm start