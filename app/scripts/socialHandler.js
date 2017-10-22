'use strict';
let write = require('./../service/test.json');
const fs = require("fs");
const asyncc = require("async");
const puppeteer = require('puppeteer');

(async () => {
    let pushArray = [];
    const browser = await puppeteer.launch();

    Object.keys(write).forEach(function (element,index,array) {

        let asyncFunc ;

        asyncFunc = (function(data) {
            console.log(data);
             return async function (cb) {
                let page = await browser.newPage();
                console.log(`https://coinmarketcap.com/currencies/${write[data].symbolToName}/#social`);
                await page.goto(`https://coinmarketcap.com/currencies/${write[data].symbolToName}/#social`,{delay : 20000});
                await page.waitForNavigation(
                    {
                        timeout : 0,
                        waitUntil : 'networkidle',
                        networkIdleTimeout : 30000
                    }
                );

                page.on('error',function (err) {
                    console.log(err);
                });


                const frames = await page.frames();
                const tryItFrame = frames.find(f => f.name() === 'twitter-widget-1');

                if (!!tryItFrame) {
                    tryItFrame.waitForSelector('.customisable-highlight')
                        .then(() => console.log('First URL with image: '));

                    let framedButton = await tryItFrame.$('.customisable-highlight');

                    if (!!framedButton) {
                        const text = await tryItFrame.evaluate(element => {
                            const text = element.getAttribute('href');
                            return {text}
                        },framedButton);

                        console.log('the outerhtml: ', text);
                        await page.close();
                        cb(null,text);
                        //Promise.resolve('c');
                    }
                    else {
                        console.log('no')
                        await page.close();
                        cb(null,data);
                        //Promise.resolve('c');
                    }

                }
                else {
                    console.log('no')
                    await  page.close();
                    cb(null,data);
                    //Promise.resolve('c');
                }
            }
        })(element);
        pushArray.push(asyncFunc);
    });


     asyncc.series(pushArray,
        // optional callback
        async function(err, results) {
            if (err) console.log(err);
            console.log(results);
            await browser.close();

    });



})();

process.setMaxListeners(0);

process.on('uncaughtException', (err) => {
    console.log(`Caught exception: ${err}`);
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
    console.error(err.stack);
    process.exit(1);
});

// console.log(write.ok);
// console.log('b');
// write.ok = '';
// fs.writeFile(__dirname+'/../service/test.json', JSON.stringify(write,null,2), function (err) {
//     if (err) return console.log(err);
//     //console.log(JSON.stringify(file));
//     console.log('writing to ' + write);
// });


