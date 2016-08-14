'use strict';
/*
 * left side add "0" for num length as n
 * 添加0使数字位数达到指定长度
*/
function leftPad(num, n) {  
    var len = num.toString().length;  
    while(len < n) {  
        num = "0" + num;  
        len++;  
    }  
    return num;  
}  
exports.leftPad=leftPad;
