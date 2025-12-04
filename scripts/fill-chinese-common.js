#!/usr/bin/env node
/**
 * Fill missing Chinese (zh-Hans) common.* translations
 * 55 translations in common namespace
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chinese translations for common.* namespace
const translations = {
  // common.actions.* (16 keys)
  "common.actions.save": "保存",
  "common.actions.saveChanges": "保存更改",
  "common.actions.saveContact": "保存联系人",
  "common.actions.cancel": "取消",
  "common.actions.delete": "删除",
  "common.actions.edit": "编辑",
  "common.actions.add": "添加",
  "common.actions.remove": "移除",
  "common.actions.close": "关闭",
  "common.actions.confirm": "确认",
  "common.actions.retry": "重试",
  "common.actions.apply": "应用",
  "common.actions.clear": "清除",
  "common.actions.reset": "重置",
  "common.actions.update": "更新",
  "common.actions.run": "运行",

  // common.states.* (7 keys)
  "common.states.loading": "加载中",
  "common.states.searching": "搜索中",
  "common.states.error": "错误",
  "common.states.success": "成功",
  "common.states.warning": "警告",
  "common.states.info": "信息",
  "common.states.ok": "确定",

  // common.entities.* (12 keys)
  "common.entities.contact": "联系人",
  "common.entities.contacts": "联系人",
  "common.entities.interaction": "互动",
  "common.entities.interactions": "互动",
  "common.entities.event": "事件",
  "common.entities.events": "事件",
  "common.entities.company": "公司",
  "common.entities.companies": "公司",
  "common.entities.note": "备注",
  "common.entities.notes": "备注",
  "common.entities.category": "类别",
  "common.entities.categories": "类别",

  // common.time.* (3 keys)
  "common.time.today": "今天",
  "common.time.tomorrow": "明天",
  "common.time.yesterday": "昨天",

  // common.dateRanges.* (4 keys)
  "common.dateRanges.allTime": "全部时间",
  "common.dateRanges.last7Days": "过去7天",
  "common.dateRanges.last30Days": "过去30天",
  "common.dateRanges.last90Days": "过去90天",

  // common.filters.* (2 keys)
  "common.filters.all": "全部",
  "common.filters.none": "无",

  // common.errors.* (7 keys)
  "common.errors.generic": "出错了",
  "common.errors.network": "网络错误",
  "common.errors.notFound": "未找到",
  "common.errors.unauthorized": "未授权",
  "common.errors.saveFailed": "保存失败",
  "common.errors.deleteFailed": "删除失败",
  "common.errors.loadFailed": "加载失败",

  // common.labels.* (4 keys)
  "common.labels.optional": "可选",
  "common.labels.required": "必填",
  "common.labels.left": "左侧",
  "common.labels.right": "右侧",
};

function fillTranslations(filePath) {
  console.log(`\n处理中文文件: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let fillCount = 0;

  const lines = content.split('\n');
  const result = [];
  let currentMsgid = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Capture msgid
    if (line.startsWith('msgid "')) {
      const match = line.match(/^msgid "([^"]+)"/);
      if (match) {
        currentMsgid = match[1];
      }
      result.push(line);
      continue;
    }

    // Fill empty msgstr
    if (line.match(/^msgstr\s*""$/)) {
      if (currentMsgid && translations[currentMsgid]) {
        const translation = translations[currentMsgid];
        if (translation) {
          result.push(`msgstr "${translation}"`);
          fillCount++;
          continue;
        }
      }
    }

    result.push(line);
  }

  fs.writeFileSync(filePath, result.join('\n'), 'utf8');
  console.log(`✅ 已填充 ${fillCount} 个翻译`);
  return fillCount;
}

// Main
const localesDir = path.join(__dirname, '..', 'locales');
const zhFile = path.join(localesDir, 'zh-Hans.po');

console.log('='.repeat(70));
console.log('填充中文简体 common.* 翻译');
console.log('='.repeat(70));

const zhFilled = fillTranslations(zhFile);

console.log('\n' + '='.repeat(70));
console.log('总结');
console.log('='.repeat(70));
console.log(`中文 (zh-Hans.po): 已添加 ${zhFilled} 个翻译`);
console.log('\n✅ 完成!\n');
