/**
 * @name unicom
 * @desc 联通_ck
 * @author axkrr
 * @update 2026-09-12
*/

const ROOT_KEY = "ComponentService"; // 持久化根 key，写入 ComponentService.ChinaUnicom.Settings.Cookie
const DONE_KEY = "CU_done_at"; // 抓取完成时间戳，超过刷新窗口后彻底停止
const SESSION_RE = /JSESSIONID/i; // Cookie 中需出现该字段才认为可用
const REFRESH_WINDOW = 15 * 60 * 1000; // 抓取成功后 15 分钟内静默跟随更新（保证拿到完整 Cookie），设为 0 即抓到立刻停止

// 读取持久化存储，兼容 Surge/Egern/Loon($persistentStore) 与 QuanX($prefs)
function prefRead(key) {
    if (typeof $persistentStore !== "undefined" && $persistentStore.read) {
        return $persistentStore.read(key);
    }
    if (typeof $prefs !== "undefined" && $prefs.valueForKey) {
        return $prefs.valueForKey(key);
    }
    return null;
}

// 写入持久化存储
function prefWrite(value, key) {
    if (typeof $persistentStore !== "undefined" && $persistentStore.write) {
        return $persistentStore.write(value, key);
    }
    if (typeof $prefs !== "undefined" && $prefs.setValueForKey) {
        return $prefs.setValueForKey(value, key);
    }
    return false;
}

// 发送通知，兼容 $notification.post 与 $notify
function notify(title, subtitle, content) {
    if (typeof $notification !== "undefined" && $notification.post) {
        $notification.post(title, subtitle, content);
    } else if (typeof $notify === "function") {
        $notify(title, subtitle, content);
    }
}

// 读取已保存的 Cookie 与抓取状态
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
        doneAt: parseInt(prefRead(DONE_KEY) || "0", 10) || 0
    };
}

// 写入 BoxJS 数据
function saveCookie(root, cookie) {
    if (!root.ChinaUnicom) {
        root.ChinaUnicom = {};
    }
    if (!root.ChinaUnicom.Settings) {
        root.ChinaUnicom.Settings = {};
    }
    root.ChinaUnicom.Settings.Cookie = cookie;
    root.ChinaUnicom.Settings.UpdatedAt = new Date().toISOString();
    prefWrite(JSON.stringify(root), ROOT_KEY);
}

// 抓取主逻辑：抓到一次通知一次，之后静默跟随一小段时间，然后彻底停止
function capture() {
    const req = typeof $request !== "undefined" ? $request : null;
    if (!req) {
        return;
    }

    const saved = readSaved();
    const firstTime = !saved.cookie || !saved.doneAt; // 还没抓到过
    const inWindow = saved.doneAt > 0 && Date.now() - saved.doneAt < REFRESH_WINDOW;

    // 抓取已结束：不写入、不通知
    if (!firstTime && !inWindow) {
        return;
    }

    const headers = req.headers || {};
    const cookie = headers.Cookie || headers.cookie || "";

    // 未检测到可用 Cookie：静默退出，不通知
    if (!cookie || !SESSION_RE.test(cookie)) {
        return;
    }

    saveCookie(saved.root, cookie);

    // 刷新窗口内只更新数据，不再打扰
    if (!firstTime) {
        return;
    }

    prefWrite(String(Date.now()), DONE_KEY);
    notify("联通", "Cookie 抓取成功", "已写入 BoxJS：ComponentService.ChinaUnicom.Settings.Cookie");
}

capture();

if (typeof $done === "function") {
    $done({});
}
