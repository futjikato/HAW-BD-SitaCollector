(function(module) {

    const MongoClient = require('mongodb').MongoClient;
    const debug = require('debug')('storage');
    const sprintf = require('sprintf-js').sprintf;

    const STORAGE_DATE_FORMAT = 'YYYY-MM-DD';

    class Storage {
        constructor() {
            this.db = undefined;
        }

        init() {
            var $this = this;
            return new Promise(function(resolve, reject) {
                MongoClient.connect('mongodb://mongodb:27017/bdp', function(err, db) {
                    if (err)
                        return reject(err);

                    debug('init done');
                    $this.db = db;
                    resolve();
                });
            });
        }
        
        close() {
            this.db.close();
        }

        storeAirline(code, data) {
            let airlineCollection = this.db.collection('airlines');
            data.airlineCode = code;

            debug(sprintf('Store airline %s', code));

            return airlineCollection.find({airlineCode: code}).limit(1).next().then(function(entity){
                if (!entity)
                    return airlineCollection.insertOne(data);
                else
                    return airlineCollection.replaceOne({airlineCode: code}, data);
            });
        }

        getAirlines() {
            return this.db.collection('airlines').find({}).toArray();
        }

        storeAirport(code, data) {
            var airportCollection = this.db.collection('airports');
            data.airportCode = code;

            debug(sprintf('Store airport %s', code));

            return airportCollection.find({airportCode: code}).limit(1).next().then(function(entity){
                if (!entity)
                    return airportCollection.insertOne(data);
                else
                    return airportCollection.replaceOne({airportCode: code}, data);
            });
        }

        storeFlight(data) {
            return this.db.collection('flights').insertOne(data);
        }

        getAirports() {
            return this.db.collection('airports').find({}).toArray();
        }
        
        getDay(mom) {
            return this.db.collection('dates').find({
                date: mom.format(STORAGE_DATE_FORMAT)
            }).limit(1).next()
        }
        
        storeDay(mom, data) {
            var dayCollection = this.db.collection('dates');
            data.date = mom.format(STORAGE_DATE_FORMAT);

            debug(sprintf('Store day %s', data.date));

            return dayCollection.find({date: data.date}).limit(1).next().then(function(entity){
                if (!entity)
                    return dayCollection.insertOne(data);
                else
                    return dayCollection.replaceOne({date: data.date}, data);
            });
        }
    }

    module.exports = Storage;
})(module);
