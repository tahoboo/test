// ==UserScript==
// @name         Redmine 增强插件 (新建/编辑模版自动填充)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  新建BUG/编辑BUG时自动填充描述或原因模版
// @match        https://redmine.jztylxx.com/issues/*
// @match        https://redmine.jztylxx.com/issues/new
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
   'use strict';
 
   // ========= 配置 =========
   const CONFIG = {
     // 编辑BUG时的原因字段
     reasonFieldId: 'issue_custom_field_values_85',
     reasonLabelKeywords: ['原因', '缺陷原因', 'Reason', 'Cause'],
     reasonTemplate: `【缺陷原因】：
 【解决方案】：
 【关联影响点】：
 【同类问题是否排查】：`,
 
     // 新建BUG时的描述字段
     descriptionFieldId: 'issue_description',
     trackerContainerId: 'select2-issue_tracker_id-container',
     trackerTargetText: '项目缺陷',
     descriptionTemplate: `【报错页面截图或者接口地址】：
 【接口请求参数】：
 【用户名/密码】：
 【重现步骤】：
 【期望值】：
 【初步原因分析】：`,
 
     debug: false
   };
 
   const FILLED_ATTR = 'data-tm-template-filled';
   function log(...args) {
     if (CONFIG.debug) console.log('[Redmine-Enhancer]', ...args);
   }
 
   // ========= 工具函数 =========
   function shouldFill(el, marker) {
     if (!el) return false;
     if (el.getAttribute(FILLED_ATTR) === marker) return false;
     if ((el.value || '').trim() !== '') return false; // 有内容不覆盖
     return true;
   }
   function fillTemplate(el, template, marker) {
     el.value = template;
     el.setAttribute(FILLED_ATTR, marker);
     el.dispatchEvent(new Event('input', { bubbles: true }));
     el.dispatchEvent(new Event('change', { bubbles: true }));
     log('填充模版:', marker);
   }
 
   // ========= 编辑BUG逻辑 =========
   function getReasonField() {
     // 1. 按ID
     let el = document.getElementById(CONFIG.reasonFieldId);
     if (el) return el;
     // 2. label 匹配
     const labels = Array.from(document.querySelectorAll('label[for]'));
     const targetLabel = labels.find(lb =>
       CONFIG.reasonLabelKeywords.some(k => lb.textContent.includes(k))
     );
     if (targetLabel) {
       const forId = targetLabel.getAttribute('for');
       return document.getElementById(forId);
     }
     return null;
   }
 
   function tryFillReason() {
     const el = getReasonField();
     if (shouldFill(el, 'reason')) {
       fillTemplate(el, CONFIG.reasonTemplate, 'reason');
     }
   }
 
   function initEditObserver() {
     // 初始尝试
     tryFillReason();
     // 点击编辑按钮后再试
     document.addEventListener('click', (e) => {
       const btn = e.target.closest('a,button');
       if (!btn) return;
       const txt = (btn.textContent || '').trim();
       if (/(编辑|更新|Edit|Update)/i.test(txt) || /icon-edit/.test(btn.className)) {
         setTimeout(tryFillReason, 200);
       }
     }, true);
     // MutationObserver 监听
     const mo = new MutationObserver(() => {
       clearTimeout(window.__tm_reason_timer);
       window.__tm_reason_timer = setTimeout(tryFillReason, 100);
     });
     mo.observe(document.body, { childList: true, subtree: true, attributes: true });
   }
 
   // ========= 新建BUG逻辑 =========
   function getDescriptionField() {
     return document.getElementById(CONFIG.descriptionFieldId);
   }
   function getTrackerText() {
     const el = document.getElementById(CONFIG.trackerContainerId);
     return el ? el.textContent.trim() : '';
   }
   function tryFillDescription() {
     const desc = getDescriptionField();
     if (getTrackerText() === CONFIG.trackerTargetText && shouldFill(desc, 'desc')) {
       fillTemplate(desc, CONFIG.descriptionTemplate, 'desc');
     }
   }
   function initNewObserver() {
     tryFillDescription();
     const trackerEl = document.getElementById(CONFIG.trackerContainerId);
     if (trackerEl) {
       const mo = new MutationObserver(() => {
         tryFillDescription();
       });
       mo.observe(trackerEl, { childList: true, characterData: true, subtree: true });
     }
   }
 
   // ========= 主入口 =========
   if (location.pathname === '/issues/new') {
     initNewObserver();
   } else if (/^\/issues\/\d+/.test(location.pathname)) {
     initEditObserver();
   }
 })();