
const https = require('https'),
    fs = require('fs'),
    network = require('../utilities/network.js');


function prepare() {
    try {
        fs.unlinkSync('azure/output/regions.json');
        fs.rmdirSync('azure/output');
    } catch (e) {
        console.log('Removing output directory failed.  This is normal');
    }
    try {
        fs.mkdirSync('azure/output');
    } catch(e) {
        console.log('output directory already exists');
    }
}

async function doDownload(url) {
    prepare();
    return unpack(await network.download(url));
    // let req = https.get(url);
    // req.end();
    // req.once('response', res => {
    //     res.on('data', unpack);
    // });
}


function unpack(value) {
    let strval = value.toString('utf-8'),
        json = JSON.parse(strval),
        rvalue = json.value,
        transformed = rvalue.map(transform),
        result = {
            regions: transformed
        };
    fs.writeFileSync('azure/output/regions.json', JSON.stringify(result), 'utf8');
}

function transform(region) {
    return {
        name: region.displayName,
        description: region.displayName,
        key: region.name,
        public: true,
        coordinates: {
            latitude: region.latitude,
            longitude: region.longitude
        },
        city: region.displayName,
        state: region.displayName,
        zones: [],
    }
}

async function extract() {
    await doDownload('https://azurepricecdn.azureedge.net/regions/regions.json')
}

module.exports = (async () => await extract())();