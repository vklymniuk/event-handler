FROM redis:latest

LABEL maintainer="Vladimir Klymniuk <Vladimir.Klymniuk@gmail.com>"

RUN mkdir -p /ust/local/etc/redis

COPY redis.conf /usr/local/etc/redis/redis.conf

VOLUME /data

EXPOSE 6379

CMD [ "redis-server" ]