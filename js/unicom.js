/**
 * @name unicom
 * @desc 联通_ck
 * @author axkrr
 * @update 2026-09-12
*/

const ROOT_KEY = "ComponentService";
const DONE_KEY = "CU_done_at";
const SESSION_RE = /JSESSIONID/i;
const REFRESH_WINDOW = 15 * 60 * 1000;

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

function capture() {
    const req = typeof $request !== "undefined" ? $request : null;
    if (!req) {
        return;
    }

    const saved = readSaved();
    const firstTime = !saved.cookie || !saved.doneAt;
    const inWindow = saved.doneAt > 0 && Date.now() - saved.doneAt < REFRESH_WINDOW;

    if (!firstTime && !inWindow) {
        return;
    }

    const headers = req.headers || {};
    const cookie = headers.Cookie || headers.cookie || "";

    if (!cookie || !SESSION_RE.test(cookie)) {
        return;
    }

    saveCookie(saved.root, cookie);

    if (!firstTime) {
        return;
    }

    prefWrite(String(Date.now()), DONE_KEY);
    notify("联通", "Cookie抓取成功", "已写入BoxJS：ComponentService.ChinaUnicom.Settings.Cookie");
}

capture();

if (typeof $done === "function") {
    $done({});
}
