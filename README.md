## EthexIndia & zebPay priceTicker notification

- EthexIndia and zebPay bid and sell notification in every 30 minutes or you can pass env variable(refreshTime), using node-notifier(mac,windows,linux) for notifications

## Requirements

Have these packages installed and running on your system.

- [Node.js](https://nodejs.org/download/), and npm.
- [MongoDB](https://www.mongodb.org/downloads)

## Installing

* Clone this repo `$ git clone https://github.com/Preetam007/priceTicker.git`
* Enter into the project directory `$ cd priceTicker`
* Run `$ npm install` to install required dependencies.
* Run `$ npm start` or `pm2 start server.js` to start the web service

## Available APIs
- /dev job dashboard to check jobs status

## Throttle limit
- ethexIndia allows one request per second

## TODO
- dynamic notification (when price is higher and lower than etc)
- add multiple exchanges(bittrex,poloneix etc)
- multiple currencies
- messenger,telegram,slack bots 
- desktop app (electron.js) and android app(ionic or react native or cordova)
- push notifications
