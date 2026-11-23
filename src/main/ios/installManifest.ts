/** Apple over-the-air install manifest for one IPA. */
export function buildInstallManifest(input: {
  ipaUrl: string;
  bundleId: string;
  version: string;
  title: string;
}): string {
  const escape = (value: string): string =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const { ipaUrl, bundleId, version, title } = input;
  return `<?xml version="1.0" encoding="UTF-8"?>
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
          <string>${escape(ipaUrl)}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${escape(bundleId)}</string>
        <key>bundle-version</key>
        <string>${escape(version)}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${escape(title)}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>
`;
}
