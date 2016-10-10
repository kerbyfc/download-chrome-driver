var wget = require('wget-improved');
var os = require('os');
var path = require('path');
var fs = require('fs');
var unzip = require('unzip');

function getSrc(type, version) {
    var src = 'http://chromedriver.storage.googleapis.com/' + version + '/' + type + '_';

    switch (os.platform()) {
        case 'darwin':
            src += 'mac64';
            break;
        case 'win32':
            src += 'win32';
            break;
        default:
            src += process.arch === 'x64' ? 'linux64' : 'linux32';
    }

    return src += '.zip';
}

function getLastVersion(callback) {
    var options = {
        protocol: 'http',
        host: 'chromedriver.storage.googleapis.com',
        path: '/LATEST_RELEASE',
        method: 'GET'
    }

    var req = wget.request(options, function (res) {
        var content = '';
        if (res.statusCode === 200) {
            res.on('error', function (err) {
                console.log(err, res);
            });
            res.on('data', function (chunk) {
                content += chunk;
            });
            res.on('end', function () {
                callback(content.toString().trim());
            });
        } else {
            console.log('Server respond ' + res.statusCode);
        }
    });

    req.end();
    req.on('error', function (err) {
        console.log(err);
    });
}

function unzipDriver(zip, dest, callback) {
    fs.createReadStream(zip).pipe(unzip.Extract({ path: dest })).on('finish', function () {
        console.log('unzipping to', dest ,'complete');
        callback();
    });
}

function downloadDriver(type, version, dest) {
    var src = getSrc(type, version);
    var tmp = path.join(os.tmpdir(), 'chromedriver.zip');

    var download = wget.download(src, tmp, {});

    download.on('start', function (fileSize) {
        console.log('download', src, fileSize, 'bytes');
    });

    download.on('error', function (err) {
        console.log(err, src);
    });

    download.on('end', function (output) {
        console.log('driver download complete');
        unzipDriver(tmp, dest, function() {
            fs.chmodSync(path.join(dest, type), '777');
        });
    });
}

module.exports = function (dest) {
    if (dest) {
        if (!path.isAbsolute(dest)) {
            dest = path.join(process.cwd(), dest);
        }
    }

    getLastVersion(function (version) {
        downloadDriver('chromedriver', version, dest || process.cwd());
    });
}
