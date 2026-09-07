function scanVisualBars(title,rows,tone='cyan'){
  const valid=rows.filter(v=>v[1]!==null&&Number.isFinite(v[1]));
  if(!valid.length)return '<section class="scanVisual '+tone+'"><h4>'+scanEscapeHTML(title)+'</h4><p>세부 자료 없음</p></section>';
  const sum=valid.reduce((n,v)=>n+v[1],0),max=Math.max(0,...valid.map(v=>v[1]));
  return '<section class="scanVisual '+tone+'"><h4>'+scanEscapeHTML(title)+'</h4>'+rows.map(([label,value])=>'<div class="scanVisualRow"><div><span>'+scanEscapeHTML(label)+'</span><b>'+(value===null?'자료 없음':Math.round(value).toLocaleString()+'명')+'</b><small>'+(value!==null&&sum?(value/sum*100).toFixed(1)+'%':'—')+'</small></div><div class="scanVisualTrack"><i style="width:'+(value!==null&&max?Math.max(0,value/max*100):0)+'%"></i></div></div>').join('')+'</section>';
}
