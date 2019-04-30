const https = require('https'),
    hparser = require('node-html-parser');

async function download(url, options) {
    let req = https.get(url, options);
    req.end();
    return new Promise((resolve, reject) => {

        req.once('response', res => {
            let page = '';
            res.on('data', ch => {
                page += ch;
            });
            res.on('end', () => {
                return resolve(page);
            });
        });
    })
}

module.exports = {
    download: download
};

