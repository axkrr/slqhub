/*
 * @name qsw
 * @desc 去上网净化
 * @author axkrr
*/

var body = $response.body;
var obj = JSON.parse(body);

// 修改数据
obj.load = 0;
obj.bid = [];
obj.data = [];
obj.lns = 0;

// 重新打包返回
body = JSON.stringify(obj);
$done({body});
