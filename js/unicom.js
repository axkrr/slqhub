/**
 * @name unicom
 * @desc 联通_ck
 * @author axkrr
 * @update 2026-11-21
*/

// 无时间窗口；写盘受 MIN_WRITE_INTERVAL 节流，仅首次或令牌变化时通知

const ROOT_KEY = "ComponentService";
const DONE_KEY = "CU_done_at";
const MIN_WRITE_INTERVAL = 3 * 60 * 1000;
const ECS_TOKEN_RE = /ecs_token=/i;
const SESSION_RE = /JSESSIONID/i;

// 持久化兼容层
function prefRead(key) {
    if (typeof $persistentStore !== "undefined" && $persistentStore.read) {
        return $persistentStore.read(key);
    }
    if (typeof $prefs !== "undefined" && $prefs.valueForKey) {
        return $prefs.valueForKey(key);
    }
    return null;
}

function prefWrite(value, key) {
    if (typeof $persistentStore !== "undefined" && $persistentStore.write) {
        return $persistentStore.write(value, key);
    }
    if (typeof $prefs !== "undefined" && $prefs.setValueForKey) {
        return $prefs.setValueForKey(value, key);
    }
    return false;
}

function notify(title, subtitle, content) {
    if (typeof $notification !== "undefined" && $notification.post) {
        $notification.post(title, subtitle, content);
    } else if (typeof $notify === "function") {
        $notify(title, subtitle, content);
    }
}

function readCookieField(cookie, name) {
    const re = new RegExp("(?:^|;)\\s*" + name + "=([^;]*)", "i");
    const m = re.exec(cookie || "");
    return m ? m[1].replace(/^"|"$/g, "") : "";
}

// 令牌优先级：ecs_token > SHAREJSESSIONID > JSESSIONID
function extractToken(cookie) {
    const ecs = readCookieField(cookie, "ecs_token");
    if (ecs) return "ecs:" + ecs;

    const share = readCookieField(cookie, "SHAREJSESSIONID");
    if (share) return "share:" + share;

    const jsession = readCookieField(cookie, "JSESSIONID");
    if (jsession) return "js:" + jsession;

    return "";
}

// 无登录态字段的匿名请求直接跳过
function hasLoginCookie(cookie) {
    return ECS_TOKEN_RE.test(cookie) || SESSION_RE.test(cookie);
}

function readSaved() {
    let root = {};
    try {
        root = JSON.parse(prefRead(ROOT_KEY) || "{}");
    } catch (e) {
        root = {};
    }

    const settings = (root.ChinaUnicom && root.ChinaUnicom.Settings) || {};

    return {
        root: root,
        cookie: settings.Cookie || "",
        writtenAt: parseInt(prefRead(DONE_KEY) || "0", 10) || 0
    };
}

// 只覆盖 Cookie 与 UpdatedAt，其它键原样保留
function saveCookie(root, cookie) {
    if (!root.ChinaUnicom) root.ChinaUnicom = {};
    if (!root.ChinaUnicom.Settings) root.ChinaUnicom.Settings = {};

    root.ChinaUnicom.Settings.Cookie = cookie;
    root.ChinaUnicom.Settings.UpdatedAt = new Date().toISOString();
    prefWrite(JSON.stringify(root), ROOT_KEY);
}

function capture() {
    const req = typeof $request !== "undefined" ? $request : null;
    if (!req) return;

    const headers = req.headers || {};
    const cookie = headers.Cookie || headers.cookie || "";
    if (!cookie) return;
    if (!hasLoginCookie(cookie)) return;

    const saved = readSaved();
    if (saved.cookie === cookie) return;

    const now = Date.now();
    const firstTime = !saved.cookie;
    const tokenChanged = extractToken(saved.cookie) !== extractToken(cookie);

    const needWrite = firstTime || tokenChanged || now - saved.writtenAt >= MIN_WRITE_INTERVAL;
    if (!needWrite) return;

    saveCookie(saved.root, cookie);
    prefWrite(String(now), DONE_KEY);

    if (firstTime) {
        const content = ECS_TOKEN_RE.test(cookie)
            ? "已写入 BoxJS：ComponentService.ChinaUnicom.Settings.Cookie"
            : "仅捕获到 JSESSIONID，建议在 App 首页再刷新一次";
        notify("联通", "Cookie 抓取成功", content);
    } else if (tokenChanged) {
        notify("联通", "Cookie 已自动更新", "检测到登录态变化，已同步到 BoxJS");
    }
}

capture();

if (typeof $done === "function") {
    $done({});
}
