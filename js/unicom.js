/**
 * @name unicom
 * @desc 联通_ck
 * @author axkrr
 * @update 2026-09-12
*/

const ROOT_KEY = "ComponentService"; // 持久化根 key
const SESSION_RE = /JSESSIONID/i; // Cookie 中需出现该字段才认为有效
const MISS_INTERVAL = 12 * 60 * 60 * 1000; // 未命中时最多 12 小时提醒一次

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
}

// 发送通知，兼容 $notification.post 与 $notify
function notify(title, subtitle, content) {
    if (typeof $notification !== "undefined" && $notification.post) {
        return $notification.post(title, subtitle, content);
    }
    if (typeof $notify === "function") {
        return $notify(title, subtitle, content);
    }
    console.log(`[${title}] ${subtitle}\n${content}`);
}

// 抓取请求头中的 Cookie 并写入 ComponentService
function getCookie() {
    const req = typeof $request !== "undefined" ? $request : null;
    if (!req) return;

    const headers = req.headers || {};
    const cookie = headers.Cookie || headers.cookie || "";
    const url = req.url || "";

    // 解析出域名与路径（去掉查询串）
    const noScheme = url.replace(/^https?:\/\//i, "");
    const host = noScheme.split("/")[0];
    const path = "/" + noScheme.slice(host.length).split("?")[0].replace(/^\//, "");

    // 命中会话 Cookie：写入并通知（Cookie 未变化时静默跳过）
    if (cookie && SESSION_RE.test(cookie)) {
        let root = {};
        try {
            const raw = prefRead(ROOT_KEY);
            if (raw) root = JSON.parse(raw);
        } catch (e) {
            root = {};
        }

        // 确保层级存在
        if (!root.ChinaUnicom) root.ChinaUnicom = {};
        if (!root.ChinaUnicom.Settings) root.ChinaUnicom.Settings = {};

        if (root.ChinaUnicom.Settings.Cookie !== cookie) {
            const names = cookie.split(";").length;
            root.ChinaUnicom.Settings.Cookie = cookie;
            root.ChinaUnicom.Settings.UpdatedAt = new Date().toISOString();
            prefWrite(JSON.stringify(root), ROOT_KEY);
            notify(
                "中国联通",
                "Cookie 写入成功",
                `来源：${path}\n字段数：${names}\nComponentService.ChinaUnicom.Settings.Cookie`
            );
        }
        return;
    }

    // 未带会话 Cookie：低频提醒，便于日后发现再次失效
    const now = Date.now();
    const last = parseInt(prefRead("CU_missNotifyAt") || "0", 10) || 0;
    if (now - last > MISS_INTERVAL) {
        prefWrite(String(now), "CU_missNotifyAt");
        notify(
            "中国联通",
            "未检测到 JSESSIONID",
            `本次请求：${host}${path}\n请在【首页-流量查询】重新触发一次`
        );
    }
}

getCookie();

if (typeof $done === "function") {
    $done({});
}
