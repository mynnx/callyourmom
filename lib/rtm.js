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
  this.authToken = null;
}

RTM.prototype.signParams = function(params) {
  var key, i, apiSig;
  var keys = [];
  var keyValPairs = '';

  params.api_key = this.key;
  if (this.authToken !== null) {
    params.auth_token = this.authToken;
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
  apiSig = crypto.createHash('md5').update(keyValPairs).digest("hex");
  params.api_sig = apiSig;
  return params;
};

RTM.prototype.setToken = function(token) {
  this.authToken = token;
};

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
    var params, url;

    if (err) {
      err.message = "Error retreiving frob: " += err.message;
      return callback(err);
    }

    params = self.signParams({
      perms: "write",
      frob: frob,
    });

    url = AUTH_URL + '?' + querystring.stringify(params);
    setTimeout(function() { self.requestToken(frob, callback); },  2 * 1000);
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
    var token, userId, username;

    if (response instanceof Error) {
      return callback(response);
    }

    token = response['auth']['token'];
    userId = response['auth']['user']['@']['id'];
    userName = response['auth']['user']['@']['username'];
    callback(null, token, userId, userName);
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
      return {
          name: list['@']['name'],
          id: list['@']['id']
      };
    });
    callback(null, lists);
  });
}

RTM.prototype.getTasks = function(list_id, callback) {
  var params = this.signParams({
    method: 'rtm.tasks.getList',
    list_id: list_id,
    filter: 'status:incomplete AND dueAfter:yesterday',
  });

  rest.get(API_URL, {
    query: params,
    parser: rest.parsers.xml
  }).on('complete', function(response) {
    var tasks;

    if (response instanceof Error) {
      console.log('error', response);
      return callback(response);
    }

    tasks = response['tasks']['list']['taskseries'].map(function(taskSeries) {
      var notes;
      var noteNames = [];

      if (taskSeries['notes'].hasOwnProperty('note')) {
        notes = taskSeries['notes']['note'];
        if (notes === undefined) {
          notes = [];
        } else if (!(notes instanceof Array)) {
          notes = [notes];
        }
        noteNames = notes.map(function(note) {
          return note['#'];
        });
      }

      return {
          name: taskSeries['@']['name'],
          id: taskSeries['task']['@']['id'],
          due: taskSeries['task']['@']['due'],
          notes: noteNames
      };
    });
    callback(null, tasks);
  });
}
exports.RTM = RTM;
