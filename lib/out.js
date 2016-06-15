(function(module) {
    'use strict';

    const Hapi = require('hapi');

    function addRoutes(storage, server) {
        server.route({
            method: 'GET',
            path: '/airports',
            handler: function (request, reply) {
                storage.getAirports().then(function(airports) {
                    reply(airports);
                });
            }
        });

        server.route({
            method: 'POST',
            path: '/details/{airportcode}/location/{city}/{lat}/{lng}',
            handler: function (request, reply) {
                let code = request.params.airportcode;
                storage.getAirport(code).then(function(detail) {
                    if (detail) {
                        detail.location = [
                            request.params.lat,
                            request.params.lng
                        ];
                        detail.cityName = request.params.city;
                        storage.storeAirport(code, detail);
                        reply(detail);
                    } else {
                        reply({error: 'Nope'});
                    }
                });
            }
        });
    }

    class Out {
        init(storage, port) {
            var $this = this;
            return new Promise(function(resolve, reject) {
                $this.server = new Hapi.Server();
                $this.server.connection({
                    port: port,
                    routes: {
                        cors: true
                    }
                });

                addRoutes(storage, $this.server);

                $this.server.start(function(err) {
                    if (err)
                        reject(err);

                    resolve();
                });
            });
        }
    }

    module.exports = Out;
})(module);
