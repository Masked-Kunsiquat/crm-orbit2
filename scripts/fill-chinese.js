#!/usr/bin/env node
/**
 * Fill missing Chinese (zh-Hans) translations
 * Based on missing translation report - 69 translations needed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chinese translations - msgid key → translation
const translations = {
  // settings.errors.* (7 keys)
  "settings.errors.biometric": "无法更新生物识别设置。请重试。",
  "settings.errors.autoLock": "无法更新自动锁定设置。请重试。",
  "settings.errors.autoLockTimeout": "无法更新自动锁定时间。请重试。",
  "settings.errors.swipeAction": "无法更新滑动操作。请重试。",
  "settings.errors.theme": "无法更新主题。请重试。",
  "settings.errors.language": "无法更新语言。请重试。",
  "settings.errors.featureToggle": "无法更新设置",

  // companies.*.error (3 keys)
  "companies.add.error": "无法创建公司",
  "companies.edit.error": "无法更新公司",
  "companies.list.delete.error": "无法删除公司",

  // interactions.filters (2 keys)
  "interactions.filters.videoCall": "视频通话",
  "interactions.filters.socialMedia": "社交媒体",

  // interactionTypes.* (2 keys)
  "interactionTypes.videoCall": "视频通话",
  "interactionTypes.socialMedia": "社交媒体",

  // addInteraction (1 key)
  "addInteraction.quickTitles.videoCall": "与{{name}}视频通话",

  // addContact (1 key)
  "addContact.sections.relationshipType": "关系类型",

  // theme.* (3 keys)
  "theme.system": "系统",
  "theme.light": "浅色",
  "theme.dark": "深色",

  // eventTypes.* (5 keys)
  "eventTypes.birthday": "生日",
  "eventTypes.anniversary": "周年纪念",
  "eventTypes.meeting": "会议",
  "eventTypes.deadline": "截止日期",
  "eventTypes.other": "其他",

  // contactDetail.tabs.* (2 keys)
  "contactDetail.tabs.info": "信息",
  "contactDetail.tabs.activity": "活动",

  // contactDetail.* (4 keys)
  "contactDetail.upcoming": "即将到来",
  "contactDetail.pastActivity": "过往活动",
  "contactDetail.addInteraction": "添加互动",
  "contactDetail.noActivity": "暂无活动",
  "contactDetail.noActivityDescription": "添加互动或事件以跟踪与此联系人的历史记录",
  "contactDetail.viewMoreInfo": "完整活动视图即将推出",

  // categories.* (10 keys)
  "categories.family": "家人",
  "categories.friends": "朋友",
  "categories.work": "工作",
  "categories.vip": "贵宾",
  "categories.coworkers": "同事",
  "categories.clients": "客户",
  "categories.leads": "潜在客户",
  "categories.vendors": "供应商",
  "categories.business": "商务",
  "categories.personal": "个人",

  // contact labels (7 keys)
  "contact.phoneLabels.mobile": "手机",
  "contact.phoneLabels.home": "家庭",
  "contact.phoneLabels.work": "工作",
  "contact.phoneLabels.other": "其他",
  "contact.emailLabels.personal": "个人",
  "contact.emailLabels.work": "工作",
  "contact.emailLabels.other": "其他",

  // contact.contactTypes.* (7 keys)
  "contact.contactTypes.bestFriend": "挚友",
  "contact.contactTypes.family": "家人",
  "contact.contactTypes.closeFriend": "好友",
  "contact.contactTypes.friend": "朋友",
  "contact.contactTypes.colleague": "同事",
  "contact.contactTypes.acquaintance": "熟人",
  "contact.contactTypes.other": "其他",

  // industries (1 key)
  "industries.realEstate": "房地产",

  // proximity settings (6 keys)
  "settings.sections.proximity": "关系洞察",
  "settings.sections.proximityDescription": "配置关系亲密度评分",
  "settings.proximity.algorithm": "亲密度算法",
  "settings.proximity.algorithmDescription": "选择如何计算关系强度",
};

// Plural forms for Chinese (Chinese uses same form for singular/plural)
const pluralTranslations = {
  "contactDetail.viewMore": ["查看{{count}}项", "查看{{count}}项"],
};

function fillTranslations(filePath) {
  console.log(`\n处理中文文件: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let fillCount = 0;

  const lines = content.split('\n');
  const result = [];
  let currentMsgid = null;
  let isPlural = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Capture msgid
    if (line.startsWith('msgid "')) {
      const match = line.match(/^msgid "([^"]+)"/);
      if (match) {
        currentMsgid = match[1];
        isPlural = false;
      }
      result.push(line);
      continue;
    }

    // Detect msgid_plural
    if (line.startsWith('msgid_plural ')) {
      isPlural = true;
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

    // Fill empty msgstr[0] or msgstr[1] for plurals
    if (line.match(/^msgstr\[(\d+)\]\s*""$/)) {
      const pluralMatch = line.match(/^msgstr\[(\d+)\]/);
      if (pluralMatch) {
        const pluralIndex = parseInt(pluralMatch[1]);
        if (currentMsgid && pluralTranslations[currentMsgid]) {
          const translation = pluralTranslations[currentMsgid][pluralIndex];
          if (translation) {
            result.push(`msgstr[${pluralIndex}] "${translation}"`);
            fillCount++;
            continue;
          }
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
console.log('填充中文简体翻译');
console.log('='.repeat(70));

const zhFilled = fillTranslations(zhFile);

console.log('\n' + '='.repeat(70));
console.log('总结');
console.log('='.repeat(70));
console.log(`中文 (zh-Hans.po): 已添加 ${zhFilled} 个翻译`);
console.log('\n✅ 完成!\n');
