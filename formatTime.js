'use strict';
const pad=require('./leftPad.js').leftPad;
function formatTime(t){
  var t=t||new Date();
  var ts=t.getFullYear()+"-"+(t.getMonth()+1)+"-"+t.getDate()+" "+pad(t.getHours(),2)+":"+pad(t.getMinutes(),2)+":"+pad(t.getSeconds(), 2)+":"+pad(t.getMilliseconds(), 3);
  return ts;
}



exports.formatTime=formatTime;
