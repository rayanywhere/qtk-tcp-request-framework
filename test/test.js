const Server = require('../src/server');
const Client = require('../src/client');
const assert = require('assert');
const server = new Server({port:8212});
server.on('data', function (socket, {uuid, data}) {
    if (data.toString('utf8') === 'echo') {
        this.send(socket, {uuid, data});
    }
    else {
        setTimeout(() => {
            this.send(socket, {uuid, data});
        }, 3000);
    }
});
server.start();

const client = new Client({host: 'localhost', port: 8212});

describe("#request", function() {
    it('should return echo', async function () {
        const response = await client.send({payload: Buffer.from('echo', 'utf8')});
        assert(response.toString('utf8') === 'echo', 'incorrect response');
    });
    it('should return timeout', function (done) {
        this.timeout(5000);
        client.send({payload: Buffer.from('echo11', 'utf8'), timeout:2}).then(() => {
            assert(false, 'should not receive anything');
        }).catch(err => {
            done();
        });
    });
});