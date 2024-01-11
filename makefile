include help.mk

build: ##@helper Build the project
build:
	@echo "$(BLUE)-> building project"
	@yarn build

.PHONY: test
test: ##@helper Test the project
test:
	@echo "$(BLUE)-> testing project"
	@yarn test

install: ##@helper Install dependencies
install:
	@echo "$(BLUE)-> installing dependencies"
	@yarn install

clean: ##@helper Clean and remove autogenerated files
clean:
	@echo "$(BLUE)-> cleaning dependencies"
	@rm -rf node_modules dist yarn.lock yarn-*

clean-install: ##@helper Remove old files and make a fresh install
clean-install:
	@make clean
	@make install

publish: ##@helper Publish the dist folder to Github Packages
publish: dist
	@echo "$(BLUE)-> publishing to Github Packages"
	@yarn publish