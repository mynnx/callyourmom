var config = require('../config.js');
var RTM = require('./rtm.js').RTM;
var GV = require('google-voice');
var _ = require('underscore');

function CallYourMom() {
  this.rtmClient = new RTM(config.rtm.apiKey, config.rtm.secret);
  this.gvClient = new GV.Client({
  	email: config.gv.email,
  	password: config.gv.password,
  });
  this.futureCalls = {};
}

CallYourMom.prototype.run = function() {
  var self = this;
  self.rtmClient.authenticate(function(err, token, userId, userName) {
    if (err) {
      return console.log('Error retrieving token', err);
    }
    self.rtmClient.setToken(token);
    self.poll()
  });
}

CallYourMom.prototype.poll = function() {
  var self = this;

  function handleTodos (err, todoList) {
    var i, todo;

    if (err) {
      err.message = "Error getting tasks: " + err.message;
      console.log(err);
      return;
    }

    console.log('Got ' + todoList.length + ' tasks');
    todoList.forEach(function (todo) {
      if (todo.due !== "" && todo.name.indexOf('Call') != -1) {
        self.scheduleCall(todo);
      }
    }, self);
  }

  console.log('Polling...');
  this.rtmClient.getTasks(config.rtm.list, handleTodos);
  setTimeout(this.poll.bind(this), config.misc.pollDelay * 1000);
}

CallYourMom.prototype.scheduleCall = function(todo) {
  var timeout, due, dueIn, number;

  function findNumber(notes) {
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].match(/^[0-9]{10}$/g)) {
        return notes[i];
      }
    }
    return null;
  }

  if (todo.due) {
    due = Date.parse(todo.due);
    dueIn = due - Date.now();
    number = findNumber(todo.notes);
    if (dueIn > 0) {
      if (!number) {
        console.log("You forgot to add a number!");
        return;
      }
      timeout = setTimeout(this.call.bind(this), dueIn, number);
      if (this.futureCalls.hasOwnProperty(todo.id)) {
        clearTimeout(this.futureCalls[todo.id]);
      }
      this.futureCalls[todo.id] = timeout;
      console.log('Will call ' + number + ' in', dueIn / 1000 / 60 + ' minutes');
    }
  }
}

CallYourMom.prototype.call = function(number) {
  var options = {
    outgoingNumber: number,
    forwardingNumber: config.gv.number,
    phoneType: 2
  };

  console.log('Calling ' + number + '...');
  this.gvClient.connect('call', options, function(error, response, body){
    var data = JSON.parse(body);
    if (error || !data.ok) {
      console.log('Error: ', error, ', response: ', body);
    } else {
      console.log('Call placed.');
    }
  });
}

exports.cym = new CallYourMom();
exports.CYM = CallYourMom;
