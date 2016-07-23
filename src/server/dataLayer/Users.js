var cassandra = require('cassandra-driver');
var assert = require('assert');

function getClient() {
    return new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'test'});
}

const query = 'SELECT * FROM poker.users WHERE username=?';
exports.getUser = function(userName, callback, errorCallback) {
    const client = getClient();
    console.log(userName)
    client.execute(query, [userName], function(err, result) {
        if (err) {
            errorCallback(err);
            return;
        }
        callback(result.rows[0]);
    });
}
