(function(module) {
    'use strict';

    const Storage = require('./storage');
    const fs = require('fs');
    const debug = require('debug')('airports');

    class Airports {

        constructor() {
            this.airports = {};
        }

        init() {
            var $this = this;
            return new Promise(function(resolve, reject) {
                $this.storage = new Storage();
                $this.storage.init().then(function() {
                    /*
                    return new Promise(function(resolve, reject) {
                        debug('Init from file');
                        fs.readFile('./data/airports.dat', function(err, buf) {
                            if (err)
                                return reject(err);

                            let c = buf.toString();
                            let rows = c.split(/\n/);
                            rows.forEach(function(row) {
                                let columns = row.split(',', 3);
                                let code = columns[0];
                                let location = [];
                                if (columns.length == 3) {
                                    location = [
                                        columns[1],
                                        columns[2]
                                    ];
                                }
                                $this.airports[code] = {
                                    airportCode: code,
                                    location: location
                                };
                            });
                            resolve();
                        })
                    });
                    */
                }).then(function() {
                    debug('Load airports from database');
                    return $this.storage.getAirports();
                }).then(function(data) {
                    if (data && Array.isArray(data)) {
                        data.forEach(function(entity) {
                            $this.airports[entity.airportCode] = entity;
                        });
                    }
                }).then(function() {
                    debug('Init complete');
                    resolve($this);
                }).catch(function(err) {
                    reject(err);
                })
            });
        }

        *generator() {
            for (var key in this.airports) {
                if (!this.airports.hasOwnProperty(key))
                    continue;

                if (this.airports.skip)
                    continue;

                yield key;
            }
        }

        notifyDelay(mom, code) {
            debug('Delay for ' + code);

            if (!this.airports.hasOwnProperty(code)) {
                this.airports[code] = {
                    airportCode: code,
                    newly: true
                }
            }

            if (!this.airports[code].dateData)
                this.airports[code].dateData = {};

            let dateFormat = mom.format('DD-MM-YYYY');
            if (!this.airports[code].dateData[dateFormat]) {
                this.airports[code].dateData[dateFormat] = {
                    delayed: 0,
                    onTime: 0
                };
            }

            this.airports[code].dateData[dateFormat].delayed++;

            return this.storage.storeAirport(code, this.airports[code]);
        }

        notifyOnTime(mom, code) {
            debug('OnTime for ' + code);

            if (!this.airports.hasOwnProperty(code)) {
                this.airports[code] = {
                    airportCode: code,
                    newly: true
                }
            }

            if (!this.airports[code].dateData)
                this.airports[code].dateData = {};

            let dateFormat = mom.format('DD-MM-YYYY');
            if (!this.airports[code].dateData[dateFormat]) {
                this.airports[code].dateData[dateFormat] = {
                    delayed: 0,
                    onTime: 0
                };
            }

            this.airports[code].dateData[dateFormat].onTime++;

            return this.storage.storeAirport(code, this.airports[code]);
        }
    }

    module.exports = Airports;
})(module);
