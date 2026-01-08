console.log("private core loaded");

// rewrite 场景
if (typeof $response !== "undefined") {
  let body = $response.body;
  // 处理 body
  $done({ body });
}

// request 场景
if (typeof $request !== "undefined") {
  // do something
  $done({});
}