/**
 * @name cpcx
 * @desc 彩票查询
 * @author evilbutcher, Phantom，axkrr
 * @update 2026-09-11
*/

const $ = new API("ssq", true);
const ERR = MYERR();
const ssq = $.read("ssq") || true; //默认查询
const dlt = $.read("dlt") || true; //默认查询
const fc3d = $.read("3d") || false; //默认关闭
const qlc = $.read("qlc") || false; //默认关闭
const findlatest = $.read("new") || true; //默认仅查询当日开奖的彩票

!(async () => {
  var week = new Date().getDay();
  if (ssq == true || ssq == "true") {
    if (findlatest == true || findlatest == "true") {
      if (week == 2 || week == 4 || week == 0) {
        $.log("查询双色球");
        await checkssq();
      } else {
        $.log("双色球今日未开奖");
      }
    } else {
      await checkssq();
    }
  }
  if (dlt == true || dlt == "true") {
    if (findlatest == true || findlatest == "true") {
      if (week == 1 || week == 3 || week == 6) {
        $.log("查询大乐透");
        await checkdlt();
      } else {
        $.log("大乐透今日未开奖");
      }
    } else {
      await checkdlt();
    }
  }
  if (fc3d == true || fc3d == "true") {
    $.log("查询福彩3D");
    await check3d();
  }
  if (qlc == true || qlc == "true") {
    if (findlatest == true || findlatest == "true") {
      if (week == 1 || week == 3 || week == 5) {
        $.log("查询七乐彩");
        await checkqlc();
      } else {
        $.log("七乐彩今日未开奖");
      }
    } else {
      await checkqlc();
    }
  }
})()
  .catch((err) => {
    if (err instanceof ERR.ParseError) {
      $.notify("彩票查询", "❌ 解析数据出现错误", err.message);
    } else {
      $.notify(
        "彩票查询",
        "❌ 出现错误",
        JSON.stringify(err, Object.getOwnPropertyNames(err))
      );
    }
  })
  .finally(() => $.done());

function checkssq() {
  const url = `https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq&issueCount=5&issueStart=&issueEnd=&dayStart=&dayEnd=&pageNo=1&pageSize=30&week=&systemType=PC`;
  const headers = {
    "Accept-Encoding": `gzip, deflate`,
    Connection: `keep-alive`,
    Referer: `https://www.cwl.gov.cn/kjxx/ssq/`,
    Accept: `application/json, text/javascript, */*; q=0.01`,
    Host: `www.cwl.gov.cn`,
    "User-Agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1`,
    "Accept-Language": `zh-cn`,
    "X-Requested-With": `XMLHttpRequest`,
  };

  const myRequest = {
    url: url,
    headers: headers,
  };

  return $.http.get(myRequest).then((response) => {
    if (response.statusCode == 200) {
      $.data = safeParse(response.body).result[0];
      var poolmoney = JSON.stringify(
        ($.data.poolmoney / 10000).toFixed(2)
      ).slice(1, -1);
      var content = $.data.content;
      var date = $.data.date;
      var name = $.data.name;
      var red = $.data.red;
      var blue = $.data.blue;
      if (content == "") {
        var detail = "红球：" + red + "\n蓝球：" + blue + "\n奖池信息暂未更新";
      } else {
        var detail =
          date +
          "\n红球：" +
          red +
          "\n蓝球：" +
          blue +
          "\n奖池：" +
          poolmoney +
          "万元\n一等奖 " +
          content;
      }
      $.notify("彩票查询", name, detail);
      $.log(name + "\n" + detail);
    }
  });
}

function checkdlt() {
  const url = `https://webapi.sporttery.cn/gateway/lottery/getDigitalDrawInfoV1.qry?isVerify=1&param=85%2C0%3B35%2C0%3B350133%2C0%3B04%2C0%3B20%2C23%3B03%2C32%3B06%2C33%3B19%2C33%3B18%2C35%3B19%2C35%3B190001%2C35%3B72%2C35%3B55%2C46`;
  const headers = {
    "Accept-Encoding": `gzip, deflate`,
    Connection: `keep-alive`,
    Referer: `https://www.lottery.gov.cn/`,
    Accept: `application/json, text/javascript, */*; q=0.01`,
    "User-Agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1`,
    "Accept-Language": `zh-cn`,
  };

  const myRequest = {
    url: url,
    headers: headers,
  };

  return $.http.get(myRequest).then((response) => {
    if (response.statusCode == 200) {
      $.data = safeParse(response.body).value.dlt;
      var dltmp = $.data.lotteryDrawResult.split(/\s+/);
      var redArr = [];
      var blueArr = [];
      for (var i = 0; i < dltmp.length; i++) {
        if (i < 5) {
          redArr.push(dltmp[i]);
        } else {
          blueArr.push(dltmp[i]);
        }
      }
      var date = $.data.lotterySaleEndtime.split(/\s+/)[0];
      var detail =
        date + "\n前区：" + redArr.join(",") + "\n后区：" + blueArr.join(",");
      $.notify("彩票查询", "大乐透", detail);
      $.log("大乐透" + "\n" + detail);
    }
  });
}

function check3d() {
  const url = `https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=3d&issueCount=30&issueStart=&issueEnd=&dayStart=&dayEnd=&pageNo=1&pageSize=30&week=&systemType=PC`;
  const headers = {
    "Accept-Encoding": `gzip, deflate`,
    Connection: `keep-alive`,
    Referer: `https://www.cwl.gov.cn/kjxx/fc3d/kjgg/`,
    Accept: `application/json, text/javascript, */*; q=0.01`,
    Host: `www.cwl.gov.cn`,
    "User-Agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 14_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Mobile/15E148 Safari/604.1`,
    "Accept-Language": `zh-cn`,
    "X-Requested-With": `XMLHttpRequest`,
  };

  const myRequest = {
    url: url,
    headers: headers,
  };

  return $.http.get(myRequest).then((response) => {
    if (response.statusCode == 200) {
      $.data = safeParse(response.body).result[0];
      var poolmoney = /^\d+(\.\d+)?$/.test($.data.poolmoney)
        ? JSON.stringify(($.data.poolmoney / 10000).toFixed(2)).slice(1, -1)
        : "NaN";
      var date = $.data.date;
      var name = $.data.name;
      var red = $.data.red;
      var num = red.split(",");
      var all = 0;
      for (var i = 0; i < num.length; i++) {
        all = all + parseInt(num[i]);
      }
      if (poolmoney == "NaN") {
        var detail =
          date + "\n结果：" + red + "\n和值：" + all + "\n奖池信息暂未更新";
      } else {
        var detail =
          date +
          "\n结果：" +
          red +
          "\n和值：" +
          all +
          "\n奖池：" +
          poolmoney +
          "万元";
      }
      $.notify("彩票查询", name, detail);
      $.log(name + "\n" + detail);
    }
  });
}

function checkqlc() {
  const url = `https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=qlc&issueCount=5&issueStart=&issueEnd=&dayStart=&dayEnd=&pageNo=1&pageSize=30&week=&systemType=PC`;
  headers = {
    "Accept-Encoding": `gzip, deflate`,
    Connection: `keep-alive`,
    Referer: `https://www.cwl.gov.cn/kjxx/qlc/`,
    Accept: `application/json, text/javascript, */*; q=0.01`,
    Host: `www.cwl.gov.cn`,
    "User-Agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 14_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Mobile/15E148 Safari/604.1`,
    "Accept-Language": `zh-cn`,
    "X-Requested-With": `XMLHttpRequest`,
  };

  const myRequest = {
    url: url,
    headers: headers,
  };

  return $.http.get(myRequest).then((response) => {
    if (response.statusCode == 200) {
      $.data = safeParse(response.body).result[0];
      var content = $.data.content;
      var name = $.data.name;
      var date = $.data.date;
      var red = $.data.red;
      var blue = $.data.blue;
      if (content == undefined || content == "") {
        var detail =
          date + "\n红球：" + red + "\n蓝球：" + blue + "\n信息暂未更新";
      } else {
        var detail =
          date + "\n红球：" + red + "\n蓝球：" + blue + "\n一等奖 " + content;
      }
      $.notify("彩票查询", name, detail);
      $.log(name + "\n" + detail);
    }
  });
}

// 接口返回非JSON时给出可读错误（而不是 Unrecognized token '<'）
function safeParse(body) {
  const text = String(body == null ? "" : body).trim();
  if (text[0] !== "{" && text[0] !== "[") {
    throw new ERR.ParseError(
      "接口返回的不是JSON（接口变更或被拦截）：\n" + text.slice(0, 120)
    );
  }
  return JSON.parse(text);
}

function MYERR() {
  class ParseError extends Error {
    constructor(message) {
      super(message);
      this.name = "ParseError";
    }
  }
  return {
    ParseError,
  };
}

/**
 * OpenAPI
 * @author: Peng-YM
 * https://github.com/Peng-YM/QuanX/blob/master/Tools/OpenAPI/README.md
 */
function ENV() {
  const isQX = typeof $task !== "undefined";
  const isLoon = typeof $loon !== "undefined";
  const isSurge = typeof $httpClient !== "undefined" && !isLoon;
  const isJSBox = typeof require == "function" && typeof $jsbox != "undefined";
  const isNode = typeof require == "function" && !isJSBox;
  const isRequest = typeof $request !== "undefined";
  const isScriptable = typeof importModule !== "undefined";
  return {
    isQX,
    isLoon,
    isSurge,
    isNode,
    isJSBox,
    isRequest,
    isScriptable,
  };
}

function HTTP(
  defaultOptions = {
    baseURL: "",
  }
) {
  const { isQX, isLoon, isSurge, isScriptable, isNode } = ENV();
  const methods = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"];
  const URL_REGEX =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

  function send(method, options) {
    options =
      typeof options === "string"
        ? {
            url: options,
          }
        : options;
    const baseURL = defaultOptions.baseURL;
    if (baseURL && !URL_REGEX.test(options.url || "")) {
      options.url = baseURL ? baseURL + options.url : options.url;
    }
    options = {
      ...defaultOptions,
      ...options,
    };
    const timeout = options.timeout;
    const events = {
      ...{
        onRequest: () => {},
        onResponse: (resp) => resp,
        onTimeout: () => {},
      },
      ...options.events,
    };

    events.onRequest(method, options);

    let worker;
    if (isQX) {
      worker = $task.fetch({
        method,
        ...options,
      });
    } else if (isLoon || isSurge || isNode) {
      worker = new Promise((resolve, reject) => {
        const request = isNode ? require("request") : $httpClient;
        request[method.toLowerCase()](options, (err, response, body) => {
          if (err) reject(err);
          else
            resolve({
              statusCode: response.status || response.statusCode,
              headers: response.headers,
              body,
            });
        });
      });
    } else if (isScriptable) {
      const request = new Request(options.url);
      request.method = method;
      request.headers = options.headers;
      request.body = options.body;
      worker = new Promise((resolve, reject) => {
        request
          .loadString()
          .then((body) => {
            resolve({
              statusCode: request.response.statusCode,
              headers: request.response.headers,
              body,
            });
          })
          .catch((err) => reject(err));
      });
    }

    let timeoutid;
    const timer = timeout
      ? new Promise((_, reject) => {
          timeoutid = setTimeout(() => {
            events.onTimeout();
            return reject(
              `${method} URL: ${options.url} exceeds the timeout ${timeout} ms`
            );
          }, timeout);
        })
      : null;

    return (
      timer
        ? Promise.race([timer, worker]).then((res) => {
            clearTimeout(timeoutid);
            return res;
          })
        : worker
    ).then((resp) => events.onResponse(resp));
  }

  const http = {};
  methods.forEach(
    (method) =>
      (http[method.toLowerCase()] = (options) => send(method, options))
  );
  return http;
}

function API(name = "untitled", debug = false) {
  const { isQX, isLoon, isSurge, isNode, isJSBox, isScriptable } = ENV();
  return new (class {
    constructor(name, debug) {
      this.name = name;
      this.debug = debug;

      this.http = HTTP();
      this.env = ENV();

      this.node = (() => {
        if (isNode) {
          const fs = require("fs");

          return {
            fs,
          };
        } else {
          return null;
        }
      })();
      this.initCache();

      const delay = (t, v) =>
        new Promise(function (resolve) {
          setTimeout(resolve.bind(null, v), t);
        });

      Promise.prototype.delay = function (t) {
        return this.then(function (v) {
          return delay(t, v);
        });
      };
    }

    // persistence
    // initialize cache
    initCache() {
      if (isQX) this.cache = JSON.parse($prefs.valueForKey(this.name) || "{}");
      if (isLoon || isSurge)
        this.cache = JSON.parse($persistentStore.read(this.name) || "{}");

      if (isNode) {
        // create a json for root cache
        let fpath = "root.json";
        if (!this.node.fs.existsSync(fpath)) {
          this.node.fs.writeFileSync(
            fpath,
            JSON.stringify({}),
            {
              flag: "wx",
            },
            (err) => console.log(err)
          );
        }
        this.root = {};

        // create a json file with the given name if not exists
        fpath = `${this.name}.json`;
        if (!this.node.fs.existsSync(fpath)) {
          this.node.fs.writeFileSync(
            fpath,
            JSON.stringify({}),
            {
              flag: "wx",
            },
            (err) => console.log(err)
          );
          this.cache = {};
        } else {
          this.cache = JSON.parse(
            this.node.fs.readFileSync(`${this.name}.json`)
          );
        }
      }
    }

    // store cache
    persistCache() {
      const data = JSON.stringify(this.cache, null, 2);
      if (isQX) $prefs.setValueForKey(data, this.name);
      if (isLoon || isSurge) $persistentStore.write(data, this.name);
      if (isNode) {
        this.node.fs.writeFileSync(
          `${this.name}.json`,
          data,
          {
            flag: "w",
          },
          (err) => console.log(err)
        );
        this.node.fs.writeFileSync(
          "root.json",
          JSON.stringify(this.root, null, 2),
          {
            flag: "w",
          },
          (err) => console.log(err)
        );
      }
    }

    write(data, key) {
      this.log(`SET ${key}`);
      if (key.indexOf("#") !== -1) {
        key = key.substr(1);
        if (isSurge || isLoon) {
          return $persistentStore.write(data, key);
        }
        if (isQX) {
          return $prefs.setValueForKey(data, key);
        }
        if (isNode) {
          this.root[key] = data;
        }
      } else {
        this.cache[key] = data;
      }
      this.persistCache();
    }

    read(key) {
      this.log(`READ ${key}`);
      if (key.indexOf("#") !== -1) {
        key = key.substr(1);
        if (isSurge || isLoon) {
          return $persistentStore.read(key);
        }
        if (isQX) {
          return $prefs.valueForKey(key);
        }
        if (isNode) {
          return this.root[key];
        }
      } else {
        return this.cache[key];
      }
    }

    delete(key) {
      this.log(`DELETE ${key}`);
      if (key.indexOf("#") !== -1) {
        key = key.substr(1);
        if (isSurge || isLoon) {
          return $persistentStore.write(null, key);
        }
        if (isQX) {
          return $prefs.removeValueForKey(key);
        }
        if (isNode) {
          delete this.root[key];
        }
      } else {
        delete this.cache[key];
      }
      this.persistCache();
    }

    // notification
    notify(title, subtitle = "", content = "", options = {}) {
      const openURL = options["open-url"];
      const mediaURL = options["media-url"];

      if (isQX) $notify(title, subtitle, content, options);
      if (isSurge) {
        $notification.post(
          title,
          subtitle,
          content + `${mediaURL ? "\n多媒体:" + mediaURL : ""}`,
          {
            url: openURL,
          }
        );
      }
      if (isLoon) {
        let opts = {};
        if (openURL) opts["openUrl"] = openURL;
        if (mediaURL) opts["mediaUrl"] = mediaURL;
        if (JSON.stringify(opts) === "{}") {
          $notification.post(title, subtitle, content);
        } else {
          $notification.post(title, subtitle, content, opts);
        }
      }
      if (isNode || isScriptable) {
        const content_ =
          content +
          (openURL ? `\n点击跳转: ${openURL}` : "") +
          (mediaURL ? `\n多媒体: ${mediaURL}` : "");
        if (isJSBox) {
          const push = require("push");
          push.schedule({
            title: title,
            body: (subtitle ? subtitle + "\n" : "") + content_,
          });
        } else {
          console.log(`${title}\n${subtitle}\n${content_}\n\n`);
        }
      }
    }

    // other helper functions
    log(msg) {
      if (this.debug) console.log(`[${this.name}] LOG: ${this.stringify(msg)}`);
    }

    info(msg) {
      console.log(`[${this.name}] INFO: ${this.stringify(msg)}`);
    }

    error(msg) {
      console.log(`[${this.name}] ERROR: ${this.stringify(msg)}`);
    }

    wait(millisec) {
      return new Promise((resolve) => setTimeout(resolve, millisec));
    }

    done(value = {}) {
      if (isQX || isLoon || isSurge) {
        $done(value);
      } else if (isNode && !isJSBox) {
        if (typeof $context !== "undefined") {
          $context.headers = value.headers;
          $context.statusCode = value.statusCode;
          $context.body = value.body;
        }
      }
    }

    stringify(obj_or_str) {
      if (typeof obj_or_str === "string" || obj_or_str instanceof String)
        return obj_or_str;
      else
        try {
          return JSON.stringify(obj_or_str, null, 2);
        } catch (err) {
          return "[object Object]";
        }
    }
  })(name, debug);
}
