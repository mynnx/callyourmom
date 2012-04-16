var rest = require('restler');
var crypto = require('crypto');
var querystring = require('querystring');
var spawn = require('child_process').spawn;

var tokens = {};
var API_URL = 'http://api.rememberthemilk.com/services/rest/';
var AUTH_URL = 'http://www.rememberthemilk.com/services/auth/';

function RTM(key, secret) {
  this.key = key;
  this.secret = secret;
  this.auth_token = null;
}

RTM.prototype.signParams = function(params) {
  var key, i, api_sig;
  var keys = [];
  var keyValPairs = '';

  params.api_key = this.key;
  if (this.auth_token !== null) {
    params.auth_token = this.auth_token;
  }

  for (key in params) {
    if (params.hasOwnProperty(key)) {
      keys.push(key);
    }
  }
  keys.sort()

  for (i = 0; i < keys.length; i++) {
    keyValPairs += keys[i] + params[keys[i]];
  }

  keyValPairs = this.secret + keyValPairs;
  api_sig = crypto.createHash('md5').update(keyValPairs).digest("hex");
  params.api_sig = api_sig;
  return params; };

RTM.prototype.requestFrob = function(callback) {
  var params = this.signParams({
    method: 'rtm.auth.getFrob',
    api_key: this.key
  });

  rest.get(API_URL, {
    query: params,
    parser: rest.parsers.xml
  }).on('complete', function(response) {
    if (response instanceof Error) {
      return callback(response);
    }
    callback(null, response.frob);
  });
};

RTM.prototype.authenticate = function(callback) {
  var self = this;
  this.requestFrob(function(err, frob) {
    var params;

    if (err) {
      return console.log('Error retrieving frob', err);
    }

    params = self.signParams({
      perms: "write",
      frob: frob,
    });

    url = AUTH_URL + '?' + querystring.stringify(params);
    setTimeout(function() { self.requestToken(frob, callback); }, 10 * 1000);
    spawn('open', [url]);
    //console.log('You need to visit this URL', url);
  });
};

RTM.prototype.requestToken = function(frob, callback) {
  var params = this.signParams({
    method: 'rtm.auth.getToken',
    frob: frob,
  });

  rest.get(API_URL, {
    query: params,
    parser: rest.parsers.xml
  }).on('complete', function(response) {
    var token, user_id, username;

    if (response instanceof Error) {
      return callback(response);
    }

    token = response['auth']['token'];
    user_id = response['auth']['user']['@']['id'];
    user_name = response['auth']['user']['@']['username'];
    callback(null, token, user_id, user_name);
  });
}

RTM.prototype.getLists = function(callback) {
  var params = this.signParams({
    method: 'rtm.lists.getList'
  });

  rest.get(API_URL, {
    query: params,
    parser: rest.parsers.xml
  }).on('complete', function(response) {
    var lists;

    if (response instanceof Error) {
      return callback(response);
    }

    lists = response['lists']['list'].map(function(list) {
      return list['@']['name'];
    });
    callback(null, lists);
  });
}

exports.RTM = RTM;
