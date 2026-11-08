"""Keep native version/runtime claims aligned with the actual web compilation target."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
p=(root/'ios/App/App.xcodeproj/project.pbxproj').read_text()
assert re.findall(r'MARKETING_VERSION = ([^;]+);',p)==['0.1.3','0.1.3']
assert re.findall(r'CURRENT_PROJECT_VERSION = ([^;]+);',p)==['4','4']
assert set(re.findall(r'IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);',p))=={'16.4'}
assert "'safari16.4'" in (root/'scripts/prepare-web.mjs').read_text()
assert not re.search(r'DEVELOPMENT_TEAM\s*=\s*\S',p),'Do not invent owner signing identities'
assert 'iOS 16.4 or newer' in (root/'IOS-INSTALL.md').read_text()
print('PASS: iOS 0.1.3/build 4; minimum iOS matches the Safari 16.4 target; owner signing remains unconfigured.')
