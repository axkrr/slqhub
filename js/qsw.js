/*
 * @name qsw
 * @desc 去上网净化
 * @author axkrr
 * @update 2026-05-18
*/

var body = $response.body;
var obj = JSON.parse(body);

// 修改数据
obj.load = 0;
obj.bid = [];
obj.data = [];
obj.lns = 0;

// 打包返回
body = JSON.stringify(obj);
$done({body});
