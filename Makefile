default: clean deps compile

clean:
	rm -rf lib
	rm -rf node_modules

deps:
	npm install

compile:
	npm run compile

test:
	npm run test

package: clean deps compile

publish: package test
	npm publish

.PHONY: default clean deps compile test package publish
