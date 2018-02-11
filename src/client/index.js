const Client = require('@qtk/tcp-framework').Client;
const genuuid = require('uuid/v4');

module.exports = class {
    constructor({host, port}) {
        this._client = new Client({host, port});
        this._pendings = new Map();
        this._now = 0;
        this._client.on("data", ({uuid, data}) => {
            const callback = this._pendings.get(uuid);
            if (callback !== undefined) {
                this._pendings.delete(uuid);
                callback.success(data);
            }
        });
        this._client.on("exception", (err) => {
            for (const callback of this._pendings.values()) {
                callback.failure(err);
            }
            this._pendings.clear();
        });

        setInterval(() => {
            this._now += 1;
            for (const uuid of this._pendings.keys()) {
                const callback = this._pendings.get(uuid);
                if (callback.expireTime <= this._now) {
                    this._pendings.delete(uuid);
                    callback.failure(new Error('request timeout'));
                }
            }
        }, 1000);
    }

    send({payload, timeout = 30}) {
        return new Promise((resolve, reject) => {
            const uuid = genuuid().replace(/-/g, '');
            this._pendings.set(uuid, {
                success: (response) => resolve(response),
                failure: error => reject(error),
                expireTime: this._now + timeout
            });
            this._client.send({uuid, data:payload});
        });
    }

    async close() {
        const sleep = () => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {resolve()}, 1000);
            });
        }
        while(this._pendings.size > 0) {
            await sleep();
        }
        this._client.close();
    }
}