/*
  Edifier Connect Splash Skip
*/

const body = {
  Code: "OK",
  Message: "成功",
  Data: {},
  RequestId: "surge-skip-splash"
};

$done({
  status: 200,
  headers: {
    "Content-Type": "application/json;charset=utf-8"
  },
  body: JSON.stringify(body)
});