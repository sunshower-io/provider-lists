const https = require('https'),
    network = require('../utilities/network.js'),
    hparser = require('node-html-parser'),
    fs = require('fs'),
    regionFile = 'azure/output/regions.json',
    docsExtractor = require('./docs-extractor.js'),
    regionCollector = require('./region-extractor.js');

function doCollectRegions() {
    let rfile = fs.readFileSync(regionFile),
        regionData = JSON.parse(rfile.toString('utf8'));
    return regionData.regions.map(t => t.key);
}

function collectRegions() {
    if (fs.existsSync(regionFile)) {
        return doCollectRegions();
    } else {
        console.log(regionCollector);
        regionCollector();
        return doCollectRegions();
    }
}

async function extract() {
    console.log("Building catalog");
    let
        aggregate = await docsExtractor.extract(),
        regions = collectRegions(),
        result = [];
    for (let region of regions) {
        await extractRegion(region, result, aggregate);
    }
    try {
        fs.unlinkSync('azure/output/catalog.json');
    } catch (e) {
        console.log('Failed to remove catalog.json...continuing');
    }
    console.log(`Finished extracting catalog.  Found ${result.length} entries`);
    fs.writeFileSync('azure/output/catalog.json', JSON.stringify(result), 'utf8');
}


async function extractRegion(region, result, aggregate) {
    let url = `https://azureprice.net/?region=${region}&currency=USD`,
        page = await network.download(url);
    doExtractRegion(page, result, aggregate);
}

function extractFeatures(product, aggregate) {
    let ag = aggregate[product.name];
    if(ag) {
        return [{
            value: ag.vcpu,
            coordinate: {
                name: 'compute:virtual-cpu'
            }
        }, {
            value: ag.network,
            coordinate: {
                name: 'network:category'
            }
        }, {
            value: ag.memory,
            coordinate: {
                name: 'compute:memory'
            }
        }, {
            value: ag.gpu,
            coordinate: {
                name: 'compute:gpu'
            }
        }, {
            value:ag.iops,
            coordinate: {
                name: 'storage:iops'
            }
        }];
    }
    return null;
}


function extractProduct(product, aggregate) {
    let features = extractFeatures(product, aggregate);
    if(features) {
        let result = [];
        if(product.windowsPrice) {
            result.push({
                name: product.name,
                price: product.windowsPrice,
                category: 'windows',
                region: product.regionId,
                features: features
            });

        }
        if(product.linuxPrice) {
            result.push({

                name: product.name,
                    price: product.linuxPrice,
                category: 'linux',
                region: product.regionId,
                features: features
            });
        }
        return result;
    }
    return null;
}


function doExtractRegion(r, result, aggregate) {
    let domval = hparser.parse(r, {
            script: true,
        }),
        root = domval.querySelector('body div.body-content script'),
        rawJson = root.innerHTML;

    let raw = eval(rawJson);
    for (let product of raw) {
        let pr = extractProduct(product, aggregate);
        if(pr) {
            result.push(...pr);
        }
    }
}




module.exports = extract();