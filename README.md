# Digital Bitbox Playground

Welcome to the Digital Bitbox Playground. This application serves as a tutorial that will guide you in developing a wallet based on Node.js and Electron.

## How To Use with Docker

Ensure that Docker is installed.

Build both Docker images:
```
docker build --tag electron_demo-ci -f Dockerfile.travis .
docker build --tag electron_demo_x11-ci -f Dockerfile.x11 .
```

Run the ElectronDemo inside of Docker:
```
./run-ElectronDemo-x11.sh
```

## How To Use without Docker

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/digitalbitbox/ElectronDemo/
# Go into the repository
cd ElectronDemo
# Install dependencies
yarn install
# Run the app
yarn start
```

## Resources for Digital Bitbox

- [digitalbitbox.com/api](https://digitalbitbox.com/api) - API documentation for the Digital Bitbox

## License

Copyright (C) 2018 Shift Devices AG, Switzerland (info@shiftcrypto.ch)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
