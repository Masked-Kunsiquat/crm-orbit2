#!/usr/bin/env node
/**
 * Fill missing Chinese (zh-Hans) plural form translations
 * Chinese uses the same form for singular and plural
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chinese plural translations (only msgstr[0] needed since nplurals=1)
// Using proper measure words: 个 (gè), 次 (cì), 家 (jiā), 条 (tiáo), 项 (xiàng)
const pluralTranslations = {
  "common.counts.contact": "{{count}}个联系人",
  "common.counts.interaction": "{{count}}次互动",
  "common.counts.event": "{{count}}个事件",
  "common.counts.company": "{{count}}家公司",
  "common.counts.category": "{{count}}个类别",
  "common.counts.note": "{{count}}条备注",
  "common.counts.result": "{{count}}个结果",
  "common.counts.item": "{{count}}项",
  "common.counts.uniqueContact": "{{count}}个独特联系人",
  "common.time.minute": "{{count}}分钟",
  "common.time.hour": "{{count}}小时",
  "common.time.day": "{{count}}天",
  "common.time.week": "{{count}}周",
  "common.time.daysAgo": "{{count}}天前",
  "common.time.minutesAgo": "{{count}}分钟前",
  "common.time.hoursAgo": "{{count}}小时前",
};

function fillPluralTranslations(filePath) {
  console.log(`\n处理中文复数形式: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let fillCount = 0;

  // Simple approach: for each msgid with a plural translation,
  // find its msgstr[0] "" and replace it
  for (const [msgid, translation] of Object.entries(pluralTranslations)) {
    const msgidPattern = `msgid "${msgid}"`;
    const msgstrPattern = /msgstr\[0\] ""/;

    // Find the position of this msgid
    let pos = content.indexOf(msgidPattern);
    if (pos === -1) continue;

    // Find the msgstr[0] "" after this msgid
    const searchStart = pos + msgidPattern.length;
    const searchSection = content.substring(searchStart, searchStart + 200);
    const msgstrMatch = searchSection.match(msgstrPattern);

    if (msgstrMatch) {
      // Replace the empty msgstr[0]
      const fullMatch = msgidPattern + searchSection.substring(0, msgstrMatch.index + msgstrMatch[0].length);
      const replacement = fullMatch.replace('msgstr[0] ""', `msgstr[0] "${translation}"`);
      content = content.replace(fullMatch, replacement);
      fillCount++;
      console.log(`  ✓ Filled: ${msgid}`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`\n✅ 已填充 ${fillCount} 个复数形式翻译`);
  return fillCount;
}

// Main
const localesDir = path.join(__dirname, '..', 'locales');
const zhFile = path.join(localesDir, 'zh-Hans.po');

console.log('='.repeat(70));
console.log('填充中文简体复数形式翻译');
console.log('='.repeat(70));

const zhFilled = fillPluralTranslations(zhFile);

console.log('\n' + '='.repeat(70));
console.log('总结');
console.log('='.repeat(70));
console.log(`中文 (zh-Hans.po): 已添加 ${zhFilled} 个复数形式翻译`);
console.log('\n✅ 完成!\n');
