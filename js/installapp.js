/**
 * @name installapp
 * @desc IPATool辅助安装IPA工具
 * @author githubdulong
 * @update 2026-05-18
*/

// 获取参数
const { name, displayVersion, bundleId, fileName } = Object.fromEntries(
  new URL(decodeURIComponent(decodeURIComponent($request.url))).searchParams
);

const url = `http://localhost:8000/${fileName}`;

const body = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>items</key>
	<array>
		<dict>
			<key>assets</key>
			<array>
				<dict>
					<key>kind</key>
					<string>software-package</string>
					<key>url</key>
					<string>${url}</string>
				</dict>
			</array>
			<key>metadata</key>
			<dict>
				<key>bundle-identifier</key>
				<string>${bundleId}</string>
				<key>bundle-version</key>
				<string>${displayVersion}</string>
				<key>kind</key>
				<string>software</string>
				<key>title</key>
				<string>${name}</string>
			</dict>
		</dict>
	</array>
</dict>
</plist>`;

// 适配qx的返回格式
$done({
    response: {
        status: 200,
        headers: {
            "Content-Type": "text/xml; charset=utf-8"
        },
        body: body
    }
});
