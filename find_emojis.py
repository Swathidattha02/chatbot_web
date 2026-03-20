import os
import re

# Regex for finding emojis
# Simple range check for common emojis
emoji_pattern = re.compile(u'[\U00010000-\U0010ffff]', flags=re.UNICODE)

root_dir = r'd:\app_intern\website_frontend\src'

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.css', '.html')):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                matches = emoji_pattern.findall(content)
                if matches:
                    print(f"File: {file_path}")
                    print(f"Emojis found: {' '.join(matches)}")
                    print("-" * 20)
