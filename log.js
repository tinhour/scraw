'use strict';
var formatTime=require('./formatTime.js').formatTime;
/*
Log 简单日记记录
arguments[0]:string 'this is name %s cost time %s have %d times.'
arguments[1]:string 'tinhour'
arguments[2]:string New Date().toString()
arguments[3]:number 3
*/
function Log(argument) {
  let argsArray = Array.prototype.slice.call(arguments);
  argsArray[0]='[%s] '+argsArray[0];
  argsArray.splice(1,0,formatTime())
  console.log.apply(this, argsArray)
}

exports.Log=Log;