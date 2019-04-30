const network = require('../utilities/network.js'),
    hparser = require('node-html-parser'),
    fs = require('fs');


class NcHandler {
    handles(table) {
        let headers = table.querySelectorAll('thead tr th');
        return headers.length >= 8 &&
            contains(headers[4], "GPU") &&
            contains(headers[7], "NICs");
    }

    apply(name, rest) {
        return {
            vcpu: numberOf(rest[0]),
            memory: numberOf(rest[1]),
            iops: 10000,
            network: 20000,
            gpu: numberOf(rest[3])

        }
    }
}

class Nd40sHandler {
    handles(table) {
        let headers = table.querySelectorAll('thead tr th');
        return headers.length >= 8 &&
            contains(headers[2], "GPU") &&
            contains(headers[7], "network");
    }

    apply(name, rest) {
        return {
            vcpu: numberOf(rest[0]),
            memory: this.mem(rest[2]),
            iops: 10000,
            network: 24000,
            gpu: 8
        }
    }

    mem(n) {
        let t = textOf(n);
        return Number.parseFloat(t.split(/\s+/)[0].trim());
    }
}

class BsHandler {
    handles(table) {
        let headers = table.querySelectorAll('thead tr th');
        return headers.length > 10 &&
            contains(headers[10], 'IOPS')


    }

    apply(name, rest) {
        return {
            vcpu: numberOf(rest[0]),
            memory: numberOf(rest[1]),
            iops: readIops(rest[9]),
            network: 10,
            gpu: 0
        }

    }
}

class StandardGSHandler {
    handles(table) {
        let headers = table.querySelectorAll('thead tr th');
        return headers.length >= 7
            && headers[6].innerHTML.indexOf('IOPS') > -1
            && headers[7].innerHTML.indexOf('network') > -1;
    }

    apply(name, rest) {
        return {
            vcpu: numberOf(rest[0]),
            memory: numberOf(rest[1]),
            iops: readIops(rest[5]),
            network: readNetwork(rest[6]),
            gpu: 0
        }
    }

}


class EvHandler {
    handles(table) {
        let headers = table.querySelectorAll('thead tr th');
        return headers.length >= 6
            && headers[5].innerHTML.indexOf('IOPS') > -1
            && headers[6].innerHTML.indexOf('Network bandwidth') > -1;
    }

    apply(name, rest) {
        return {
            vcpu: numberOf(rest[0]),
            memory: numberOf(rest[1]),
            iops: readIops(rest[4]),
            network: readNetwork(rest[5]),
            gpu: 0
        }
    }
}

class DvHandler {
    handles(table) {
        let headers = table.querySelectorAll('thead tr th');
        return headers.length >= 7
            && contains(headers[4], 'IOPS')
            && contains(headers[6], 'NICs');
    }

    apply(name, rest) {
        return {
            vcpu: numberOf(rest[0]),
            memory: numberOf(rest[1]),
            iops: readIops(rest[3]),
            network: readNetwork(rest[5]),
            gpu: 0
        }
    }
}

class LvHandler {
    handles(table) {
        let headers = table.querySelectorAll('thead tr th');
        return headers.length >= 9
            && contains(headers[6], 'IOPs')
            && contains(headers[8], 'NICs');
    }

    apply(name, rest) {

        return {
            vcpu: numberOf(rest[0]),
            memory: numberOf(rest[1]),
            iops: readIops(rest[5]),
            network: readNetwork(rest[7]),
            gpu: 0
        }

    }
}


const handlers = [
    new StandardGSHandler(),
    new EvHandler(),
    new DvHandler(),
    new BsHandler(),
    new LvHandler(),
    new NcHandler(),
    new Nd40sHandler()
];


function contains(el, str) {
    return textOf(el).indexOf(str) > -1;
}

async function readPage(url) {
    let page = await network.download(url),
        dom = hparser.parse(page),
        result = {},
        tables = dom.querySelectorAll('#main table');

    for (let table of tables) {
        extract(table, result);
    }
    return result;
}

function lookup(table) {
    let matching = handlers.filter(t => t.handles(table));
    if (matching.length) {
        return matching[0];
    }
    return null;
}

function extract(table, result) {
    let trs = table.querySelectorAll('tbody tr');
    for (let tr of trs) {
        let tds = tr.querySelectorAll('td'),
            name = readName(tds[0]),
            rest = tds.slice(1),
            handler = lookup(table);
        if (handler) {
            result[name] = handler.apply(name, rest);
        } else {
            console.log(`No handler found for instance type named '${name}'`)
        }
    }
    return result;
}

function readName(el) {
    return el.innerHTML.split(/[ <*]/)[0].trim();
}

function readIops(el) {
    let text = textOf(el),
        parts = text.replace(',', '').split(/\s*\//)
    return Number.parseFloat(parts[0]);
}

function readNetwork(el) {
    let text = textOf(el),
        parts = text.replace(',', '').split(/\s*\//),
        value = Number.parseFloat(parts[1]);
    return value;
}


function numberOf(el) {
    return Number.parseFloat(textOf(el));
}

function textOf(el) {
    return el.innerHTML.trim();
}

async function writeAll() {
    console.log("Extracting Azure Catalog Entries...");
    let pages = ['memory', 'general', 'compute', 'storage', 'gpu'],
        prefix = `https://docs.microsoft.com/en-us/azure/virtual-machines/linux/sizes-`,
        aggregate = {};
    for(let page of pages) {


        let p = prefix + page;
        console.log("Extracting Catalog: " + page);
        let result = await readPage(p);
        Object.assign(aggregate, result);
        console.log("Completed Catalog Extraction: " + page);
    }
    console.log("Finished Catalog Extraction");
    return aggregate;
}

module.exports = {
    extract: writeAll
};


