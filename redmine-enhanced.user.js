// ==UserScript==
// @name         Redmine 增强插件（终极版）
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  新建/编辑 BUG 自动填充模版（无日志）
// @match        https://redmine.jztylxx.com/issues/*
// @match        https://redmine.jztylxx.com/issues/new
// @match        https://redmine.jztylxx.com/projects/qxkpm/issues/new
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        reasonFieldId: 'issue_custom_field_values_85',
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
【初步原因分析】：`
    };

    const FILLED_ATTR = 'data-tm-template-filled';

    function shouldFill(el, marker){
        if(!el) return false;
        if(el.getAttribute(FILLED_ATTR)===marker) return false;
        if((el.value||'').trim()!=='') return false;
        return true;
    }

    function fillTemplate(el, template, marker){
        if(!el) return;
        el.value = template;
        el.setAttribute(FILLED_ATTR, marker);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
    }

    function getReasonField(){
        return document.getElementById(CONFIG.reasonFieldId);
    }
    function getDescriptionField(){ return document.getElementById(CONFIG.descriptionFieldId);}
    function getTrackerText(){ 
        const el = document.getElementById(CONFIG.trackerContainerId); 
        return el?el.textContent.trim():'';
    }

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
        tryFillNewBug();

        const trackerEl = document.getElementById(CONFIG.trackerContainerId);
        if(trackerEl){
            const mo = new MutationObserver(()=>{
                setTimeout(tryFillNewBug,50);
            });
            mo.observe(trackerEl,{childList:true,subtree:true,characterData:true});
        }

        const moBody = new MutationObserver(()=>{
            tryFillNewBug();
        });
        moBody.observe(document.body,{childList:true,subtree:true});
    }

    // ================== 编辑 BUG ==================
    function tryFillReasonEdit(){
        const reason = getReasonField();
        if(reason && shouldFill(reason,'reason')) fillTemplate(reason, CONFIG.reasonTemplate,'reason');
    }

    function initEditBug(){
        tryFillReasonEdit();

        document.addEventListener('click',e=>{
            const btn = e.target.closest('a,button');
            if(!btn) return;
            const txt = (btn.textContent||'').trim();
            if(/(编辑|更新|Edit|Update)/i.test(txt)||/icon-edit/.test(btn.className)){
                setTimeout(tryFillReasonEdit,300);
            }
        },true);

        const mo = new MutationObserver(()=>{
            tryFillReasonEdit();
        });
        mo.observe(document.body,{childList:true,subtree:true});
    }

    // ================== 主入口 ==================
    function main(){
        const newUrls = ['/issues/new','/projects/qxkpm/issues/new'];
        if(newUrls.some(u=>location.pathname.startsWith(u))){
            initNewBug();
        } else if(/^\/issues\/\d+/.test(location.pathname)){
            initEditBug();
        }
    }

    window.addEventListener('load',main);
})();
