// 伪造一个成功的空广告响应
let obj = {
  "code": 1,
  "msg": "success",
  "data": []
};
$done({body: JSON.stringify(obj), status: 200});
