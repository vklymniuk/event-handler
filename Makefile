.DEFAULT_GOAL:=prepeare

services=redis

token: token
	cp .npmrc_dummy .npmrc

prepeare:
	mkdir logs

run:
	npm start && docker-composer up -d {services}