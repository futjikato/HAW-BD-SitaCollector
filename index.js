const Sita = require('./lib/sita');
const Airlines = require('./lib/airlines');
const Airports = require('./lib/airports');
const Storage = require('./lib/storage');
const Out = require('./lib/out');
const debug = require('debug')('main');
const moment = require('moment');
const sprintf = require('sprintf-js').sprintf;

const sita = new Sita(process.env.APIKEY);
const airports = new Airports();
const airlines = new Airlines();
const storage = new Storage();
const outApi = new Out();
const argv = require('minimist')(process.argv.slice(2), {
    boolean: ['dontcrawl']
});

/**
 * Main worker function.
 * Iterates over all airports, requests all flights and processes the data.
 *
 * @param {moment} mom
 */
function repeat(mom) {
    var airportGen = airports.generator();

    /**
     * Iterate over each airport
     */
    function nextAirport(successes) {
        var it = airportGen.next();
        if (!it.done) {
            var airportCode = it.value;
            // start airline iteration for this airport
            setTimeout(function() {
                debug(sprintf('Load flights for airport %s at %s', airportCode, mom.format('YYYY-MM-DD')));
                sita.load(mom, airportCode).then(function(data) {
                    if (data && data.flightRecord) {
                        successes++;
                        let dbQueue = Promise.resolve(data.flightRecord);
                        dbQueue = dbQueue.then(function handleRecords(flightRecords) {
                            let record = flightRecords.shift();
                            if (record.scheduled && record.actual) {
                                return new Promise(function(resolve) {
                                    record.arrivalAirport = airportCode;
                                    storage.storeFlight(record).then(function() {
                                        let scheduled = moment(record.scheduled);
                                        let actual = moment(record.actual);

                                        let pAry = [];
                                        if (actual.unix() > scheduled.add(10, 'm').unix()) {
                                            pAry.push(airports.notifyDelay(mom, record.airportCode));
                                            pAry.push(airports.notifyDelay(mom, airportCode));
                                        } else {
                                            pAry.push(airports.notifyOnTime(mom, record.airportCode));
                                            pAry.push(airports.notifyOnTime(mom, airportCode));
                                        }
                                        Promise.all(pAry).then(function() {
                                            debug('saved airports.');
                                            if (flightRecords.length > 0) {
                                                dbQueue = dbQueue.then(handleRecords);
                                                resolve(flightRecords);
                                            } else {
                                                nextAirport(successes);
                                            }
                                        }).catch(function(err) {
                                            if (err)
                                                debug(err);
                                        });
                                    });
                                });
                            } else {
                                if (flightRecords.length > 0) {
                                    dbQueue = dbQueue.then(handleRecords);
                                    return flightRecords;
                                } else {
                                    nextAirport(successes);
                                }
                            }
                        })
                    } else {
                        debug(sprintf('EMpty request for airport %s', airportCode));
                        nextAirport(successes);
                    }
                }).catch(function(err) {
                    debug(sprintf('Failed request for airport %s: %s', airportCode, err));
                    nextAirport(successes);
                });
            }, 4000);
        } else {
            // store information about the time frame we crawled.
            storage.storeDay(mom, {
                successes: successes
            });

            mom.add(1, 'd');
            setTimeout(function() {
                checkIfCrawled(mom);
            }, 86400000);
        }
    }

    // start airport iteration
    debug(sprintf('Start crawling for %s', mom.format('YYYY-MM-DD')));
    nextAirport(0);
}

function checkIfCrawled(mom) {
    storage.getDay(mom).then(function(entity) {
        if (entity) {
            mom.add(24, 'h');
            var diff = mom.valueOf() - moment().valueOf();
            debug(sprintf('Wait for %dms (24h)', diff));
            setTimeout(function() {
                checkIfCrawled(mom);
            }, diff);
        } else {
            repeat(mom);
        }
    })
}

// Start work in sequence
var workerSeq = Promise.resolve();
workerSeq.then(function() {
    // initialize airport model
    return airports.init();
}).then(function() {
    // initialize airlines model
    return airlines.init();
}).then(function() {
    // initialize storage standalone for day information that has no model
    return storage.init();
}).then(function() {
    // initialize output http api
    return outApi.init(storage, process.env.HTTPPORT);
}).then(function() {
    let mom = moment();
    mom.millisecond(0);
    mom.second(0);
    mom.minutes(0);
    mom.hour(0);
    mom.subtract(1, 'd');

    if (!argv.dontcrawl) {
        debug('Start checking');
        checkIfCrawled(mom);
    }
}).catch(function(err) {
    debug(sprintf('Initialization error %s', err));
});
