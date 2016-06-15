(function(module) {

    const request = require('request');
    const sprintf = require('sprintf-js').sprintf;
    const debug = require('debug')('sita');

    const baseUrl = 'https://flifo.api.aero/flifo/v3';

    class Sita {
        constructor(Id) {
            this.ApiKey = Id;
        }

        /**
         * Load all arrivals at the given airport from the given time frame.
         *
         * @param {moment} mom
         * @param {string} airportCode
         *
         * @returns {Promise}
         */
        load(mom, airportCode) {
            var $this = this;
            return new Promise(function(resolve, reject) {
                let url = sprintf('%s/flights/%s/A?operationDate=%s', baseUrl, airportCode, mom.format('YYYY-MM-DD'));
                debug(sprintf('Request %s with', url));
                request({
                    url: url,
                    method: 'GET',
                    headers: {
                        'X-apiKey': $this.ApiKey
                    }
                }, function (err, httpResponse, body) {
                    if (err)
                        return reject(err);

                    if (httpResponse.statusCode != 200) {
                        debug(sprintf('Error %j with body %j', httpResponse, body));
                        return reject(Error('Error with status code ' + httpResponse.statusCode));
                    }

                    try {
                        let data = JSON.parse(body);
                        resolve(data);
                    } catch (e) {
                        reject(Error('Unable to parse json response'));
                    }
                });
            });
        }
    }

    module.exports = Sita;
})(module);
