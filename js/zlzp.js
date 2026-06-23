/*
 * @name 智联招聘
 * @desc 应用净化
 * @author axkrr
 * @update 2026-06-23
*/

var body = $response.body;
var obj = JSON.parse(body);

obj.data.open = false;
obj.data.responseOpen = false;

body = JSON.stringify(obj);
$done({body});
