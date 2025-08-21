
// ==UserScript==
// @name         Redmine 增强插件（稳定版）
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  新建/编辑 BUG 自动填充模版，兼容 Chrome/Edge/Firefox，多新建地址
// @match        https://redmine.jztylxx.com/issues/*
// @match        https://redmine.jztylxx.com/issues/new
// @match        https://redmine.jztylxx.com/projects/qxkpm/issues/new
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        reasonFieldId: 'issue_custom_field_values_85',
        reasonLabelKeywords: ['原因','缺陷原因','Reason','Cause'],
        reasonTemplate: `【缺陷原因】：
【解决方案】：
【关联影响点】：
【同类问题是否排查】：`,

        descriptionFieldId: 'issue_description',
        trackerContainerId: 'select2-issue_tracker_id-container',
        trackerTargetText: '项目缺陷',
        descriptionTemplate:  `【缺陷描述】：
【缺陷截图/接口地址】：
【接口请求参数】：
【用户名/密码】：
【重现步骤】：
【预期】：
【初步原因分析】：`,

        debug: false
    };

    const FILLED_ATTR = 'data-tm-template-filled';
    function log(...args){ if(CONFIG.debug) console.log('[Redmine-Enhancer]',...args); }

    function shouldFill(el, marker){
        if(!el) return false;
        if(el.getAttribute(FILLED_ATTR)===marker) return false;
        if((el.value||'').trim()!=='') return false;
        return true;
    }

    function fillTemplate(el, template, marker){
        el.value = template;
        el.setAttribute(FILLED_ATTR, marker);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
        log('填充模版:',marker);
    }

    function getReasonField(){
        let el = document.getElementById(CONFIG.reasonFieldId);
        if(el) return el;
        const labels = Array.from(document.querySelectorAll('label[for]'));
        const targetLabel = labels.find(lb=> CONFIG.reasonLabelKeywords.some(k=>lb.textContent.includes(k)));
        if(targetLabel){
            const forId = targetLabel.getAttribute('for');
            return document.getElementById(forId);
        }
        return null;
    }

    function getDescriptionField(){ return document.getElementById(CONFIG.descriptionFieldId);}
    function getTrackerText(){ const el = document.getElementById(CONFIG.trackerContainerId); return el?el.textContent.trim():'';}

    // ================== 新建 BUG ==================
    function tryFillNewBug(){
        const trackerText = getTrackerText();
        if(trackerText===CONFIG.trackerTargetText){
            const desc = getDescriptionField();
            if(shouldFill(desc,'desc')) fillTemplate(desc, CONFIG.descriptionTemplate,'desc');
            const reason = getReasonField();
            if(shouldFill(reason,'reason')) fillTemplate(reason, CONFIG.reasonTemplate,'reason');
        }
    }

    function initNewBug(){
        // 轮询确保元素生成
        const intervalId = setInterval(()=>{
            const desc = getDescriptionField();
            const reason = getReasonField();
            const tracker = document.getElementById(CONFIG.trackerContainerId);
            if((desc||reason||tracker)){
                tryFillNewBug();
            }
        },150);

        // select2 变化监听
        const trackerEl = document.getElementById(CONFIG.trackerContainerId);
        if(trackerEl){
            const mo = new MutationObserver(()=>{ setTimeout(tryFillNewBug,50); });
            mo.observe(trackerEl,{childList:true,subtree:true,characterData:true});
        }
    }

    // ================== 编辑 BUG ==================
    function tryFillReasonEdit(){
        const reason = getReasonField();
        if(shouldFill(reason,'reason')) fillTemplate(reason, CONFIG.reasonTemplate,'reason');
    }

    function initEditBug(){
        const intervalId = setInterval(()=>{
            tryFillReasonEdit();
        },150);

        // 点击编辑按钮触发
        document.addEventListener('click',e=>{
            const btn = e.target.closest('a,button');
            if(!btn) return;
            const txt = (btn.textContent||'').trim();
            if(/(编辑|更新|Edit|Update)/i.test(txt)||/icon-edit/.test(btn.className)){
                setTimeout(tryFillReasonEdit,200);
            }
        },true);

        // 监听表单出现
        const mo = new MutationObserver(()=> setTimeout(tryFillReasonEdit,100));
        mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
    }

    // ================== 主入口 ==================
    function main(){
        // 新建 BUG 页面 URL 列表
        const newUrls = ['/issues/new','/projects/qxkpm/issues/new'];
        if(newUrls.some(u=>location.pathname.startsWith(u))){
            initNewBug();
        } else if(/^\/issues\/\d+/.test(location.pathname)){
            initEditBug();
        }
    }

    // 页面加载完成后启动
    window.addEventListener('load',main);

})();
