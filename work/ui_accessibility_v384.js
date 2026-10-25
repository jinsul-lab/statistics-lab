// View-only keyboard and focus behavior. Data/API flows remain in the application.
function initJinsulAccessibleUI(){
  const modals=[...document.querySelectorAll('.modalBack')],stack=[],openers=new WeakMap(),known=new WeakMap();
  const labels={statsModal:'환자 상세 통계 분석',scanReportModal:'입지 상세분석',hospitalListModal:'병원 검색 결과',routeModal:'직선거리 기준 방문 순서'};
  const visible=el=>el&&getComputedStyle(el).display!=='none'&&!el.hidden;
  const focusables=modal=>[...modal.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
  function closeModal(modal){modal.style.display='none';}
  for(const modal of modals){
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',labels[modal.id]||'상세보기');modal.tabIndex=-1;
    // Older dialogs used a non-focusable span for their close control.
    modal.querySelectorAll('.modalHeader>span[onclick]').forEach(span=>{
      const button=document.createElement('button');button.type='button';button.className='statsClose';button.setAttribute('aria-label',(labels[modal.id]||'상세보기')+' 닫기');button.textContent='×';button.onclick=()=>closeModal(modal);span.replaceWith(button);
    });
    const sync=()=>{
      const isOpen=visible(modal);if(known.get(modal)===isOpen)return;known.set(modal,isOpen);modal.setAttribute('aria-hidden',String(!isOpen));
      if(isOpen){openers.set(modal,document.activeElement);stack.push(modal);(focusables(modal)[0]||modal).focus({preventScroll:true});}
      else {const index=stack.indexOf(modal);if(index>=0)stack.splice(index,1);const parent=stack.at(-1),opener=openers.get(modal);if(opener?.isConnected&&(!parent||parent.contains(opener)))opener.focus({preventScroll:true});else if(parent)(focusables(parent)[0]||parent).focus({preventScroll:true});}
    };
    known.set(modal,false);modal.setAttribute('aria-hidden','true');new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['style','class','hidden']});sync();
  }
  document.addEventListener('keydown',event=>{
    const modal=stack.at(-1);if(!modal||!visible(modal))return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeModal(modal);return;}
    if(event.key!=='Tab')return;
    const items=focusables(modal),first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();modal.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}
  },true);
  const groups=[document.querySelector('.sidebarTabs'),document.querySelector('#statsModal .tabBar'),document.querySelector('.scanReportTabs')].filter(Boolean);
  for(const group of groups){
    const buttons=[...group.querySelectorAll('button')];group.setAttribute('role','tablist');group.setAttribute('aria-label',group.classList.contains('tabBar')?'환자 통계 항목':group.classList.contains('scanReportTabs')?'입지 분석 항목':'분석 모드');
    const syncTabs=()=>buttons.forEach(button=>{const selected=button.classList.contains('active');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    for(const button of buttons){
      const paneId=button.getAttribute('onclick')?.match(/switchTab\('([^']+)'\)/)?.[1];
      if(paneId){const pane=document.getElementById(paneId);button.id||='control-'+paneId;button.setAttribute('aria-controls',paneId);if(pane){pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',button.id);}}
      new MutationObserver(syncTabs).observe(button,{attributes:true,attributeFilter:['class']});
    }
    group.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!buttons.includes(document.activeElement))return;
      event.preventDefault();const enabled=buttons.filter(b=>!b.disabled),index=enabled.indexOf(document.activeElement);
      const next=event.key==='Home'?0:event.key==='End'?enabled.length-1:(index+(event.key==='ArrowRight'?1:-1)+enabled.length)%enabled.length;
      enabled[next]?.focus();enabled[next]?.click();
    });syncTabs();
  }
}
document.addEventListener('DOMContentLoaded',initJinsulAccessibleUI,{once:true});
