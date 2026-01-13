/**
 * @name slqhubcore
 * @desc 适配qx重写私有仓库获取脚本
 * @author axkrr,Peng-YM,dcpeng
*/

console.log("private core loaded");

// rewrite场景
if (typeof $response !== "undefined") {
  let body = $response.body;
  // 处理body
  $done({ body });
}

// request场景
if (typeof $request !== "undefined") {
  // do something
  $done({});
}