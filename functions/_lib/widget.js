/**
 * The OwnerSpec MCP App view (MCP Apps standard, io.modelcontextprotocol/ui,
 * spec 2026-01-26). One self-contained HTML document served as the ui://
 * resource every UI tool points at; it renders by `structuredContent.view`.
 *
 * No SDK and no third-party origin: the bridge is plain postMessage JSON-RPC
 * (ui/initialize, ui/notifications/tool-result, ui/open-link,
 * ui/update-model-context, ui/notifications/size-changed), so the declared CSP
 * is empty and reviewers have nothing external to audit.
 *
 * Calculators run the page's own form and inline script, taken verbatim from
 * /index.json, so an answer in the chat is the answer on the page.
 *
 * Links open ownerspec.com pages only. The view never shows a product link or
 * a price: both app directories reject sponsored placements, and the pages
 * carry the affiliate disclosure where the links live.
 */
export const WIDGET_URI = "ui://ownerspec/view-v1.html";
export const WIDGET_MIME = "text/html;profile=mcp-app";

export const WIDGET_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OwnerSpec</title>
<style>
:root{
  --color-background-primary:light-dark(#ffffff,#1a1d1b);
  --color-background-secondary:light-dark(#f3f5f3,#232825);
  --color-text-primary:light-dark(#18201c,#e8ece9);
  --color-text-secondary:light-dark(#56625b,#a3afa8);
  --color-border-primary:light-dark(#d6ddd8,#36403a);
  --color-text-danger:light-dark(#b3362c,#f08a80);
  --color-background-danger:light-dark(#f8e3e1,#3a1f1c);
  --color-text-warning:light-dark(#9a6200,#e8b45a);
  --color-background-warning:light-dark(#fbf0dc,#33291a);
  --color-text-success:light-dark(#2f7a3b,#7ccf88);
  --color-background-success:light-dark(#e6f2e7,#1b2f1f);
  --font-sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --font-mono:ui-monospace,Menlo,Consolas,monospace;
  --border-radius-md:8px;
  --os-accent:light-dark(#0f6b5a,#5cc4ad);
  color-scheme:light dark;
}
:root[data-theme="light"]{color-scheme:light}
:root[data-theme="dark"]{color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0;background:var(--color-background-primary);color:var(--color-text-primary);font-family:var(--font-sans);font-size:14px;line-height:1.5}
.app{padding:14px 16px 12px}
.eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--color-text-secondary)}
h1{font-size:16px;margin:2px 0 10px;line-height:1.3}
h2{font-size:14px;margin:0 0 4px}
p{margin:0 0 8px}
.muted{color:var(--color-text-secondary)}
.small{font-size:12px}
a,.link{color:var(--os-accent);cursor:pointer;text-decoration:underline;background:none;border:0;padding:0;font:inherit;text-align:left}
a:focus-visible,.link:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--os-accent);outline-offset:2px}
.list{display:grid;gap:8px}
.card{border:1px solid var(--color-border-primary);border-radius:var(--border-radius-md);padding:10px 12px;background:var(--color-background-primary)}
.tbl{overflow-x:auto;border:1px solid var(--color-border-primary);border-radius:var(--border-radius-md)}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid var(--color-border-primary);vertical-align:top}
th{font-family:var(--font-mono);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-secondary);background:var(--color-background-secondary)}
tr:last-child td{border-bottom:0}
td.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.chip{display:inline-block;font-family:var(--font-mono);font-size:11px;padding:1px 6px;border-radius:4px;white-space:nowrap}
.bad{background:var(--color-background-danger);color:var(--color-text-danger)}
.warn{background:var(--color-background-warning);color:var(--color-text-warning)}
.ok{background:var(--color-background-success);color:var(--color-text-success)}
.calc form,.calc .calc-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 12px;margin:0 0 10px}
.calc label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--color-text-secondary)}
.calc input,.calc select{font:inherit;font-size:14px;color:var(--color-text-primary);background:var(--color-background-primary);border:1px solid var(--color-border-primary);border-radius:6px;padding:6px 8px;min-width:0}
.calc output{display:block;padding:10px 12px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);font-size:14px;font-weight:500}
.calc .calc-note,.calc p{font-size:12px;color:var(--color-text-secondary);margin-top:8px}
.calc table{margin-top:8px}
.foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;margin-top:12px;padding-top:8px;border-top:1px solid var(--color-border-primary);font-size:12px;color:var(--color-text-secondary)}
.empty{color:var(--color-text-secondary)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="app" id="app"><p class="empty">Loading OwnerSpec...</p></div>
<script>
(function(){
  var app=document.getElementById('app');
  var nextId=0, pending={}, lastData=null;
  function send(msg){ window.parent.postMessage(msg,'*'); }
  function request(method,params){
    var id=++nextId;
    send({jsonrpc:'2.0',id:id,method:method,params:params||{}});
    return new Promise(function(res,rej){ pending[id]={res:res,rej:rej}; setTimeout(function(){ if(pending[id]){ delete pending[id]; rej(new Error('timeout')); } },15000); });
  }
  function notify(method,params){ send({jsonrpc:'2.0',method:method,params:params||{}}); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function isOwn(url){ try{ var u=new URL(url); return u.protocol==='https:'&&u.hostname==='ownerspec.com'; }catch(e){ return false; } }
  function openLink(url){
    if(!isOwn(url)) return;
    request('ui/open-link',{url:url}).catch(function(){ try{ window.open(url,'_blank','noopener'); }catch(e){} });
  }
  app.addEventListener('click',function(e){
    var t=e.target.closest('[data-href]');
    if(t){ e.preventDefault(); openLink(t.getAttribute('data-href')); }
  });
  function link(url,label){ return '<button type="button" class="link" data-href="'+esc(url)+'">'+esc(label)+'</button>'; }
  function foot(url,extra){
    return '<div class="foot"><span>OwnerSpec · independent, cited reference'+(extra?' · '+esc(extra):'')+'</span>'+(url?link(url,'Open the page'):'')+'</div>';
  }

  function applyContext(ctx){
    if(!ctx) return;
    if(ctx.theme){ document.documentElement.setAttribute('data-theme',ctx.theme); }
    var vars=ctx.styles&&ctx.styles.variables;
    if(vars){ for(var k in vars){ if(vars[k]) document.documentElement.style.setProperty(k,vars[k]); } }
  }

  /* ---- views ---- */
  function viewGuides(d){
    var h='<div class="eyebrow">'+esc(d.eyebrow||'Diagnosis')+'</div><h1>'+esc(d.heading||'Matching OwnerSpec guides')+'</h1>';
    if(!d.guides||!d.guides.length){ return h+'<p class="empty">No guide matched. Describe the colour, smell, taste or test result.</p>'+foot(); }
    h+='<div class="list">';
    d.guides.forEach(function(g){
      h+='<div class="card"><h2>'+esc(g.title)+'</h2><p class="small">'+esc(g.quick_answer||g.description||'')+'</p>'+
        '<div class="small muted">'+(g.verified?'Facts verified '+esc(g.verified)+' · ':'')+link(g.url,'Read the guide')+'</div></div>';
    });
    return h+'</div>'+foot(null);
  }

  function viewReport(d){
    var label={above:['Above','bad'],at_or_below:['At or below','ok'],below_detection:['Not detected','ok'],within:['Within range','ok'],
      above_range:['Above range','warn'],below_range:['Below range','warn'],no_epa_limit:['No EPA limit','warn'],unit_mismatch:['Check unit','warn']};
    var h='<div class="eyebrow">Water report vs EPA limits</div><h1>'+esc(d.summary||'Your results against the EPA table')+'</h1>';
    h+='<div class="tbl"><table><thead><tr><th>Result</th><th>Limit</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>';
    (d.rows||[]).forEach(function(r){
      var s=label[r.status]||[r.status,'warn'];
      var kind=r.limit?({primary:'Enforceable MCL',action:'Action level',radionuclide:'Enforceable MCL',pfas:'PFAS MCL',secondary:'Secondary (taste, stain)'}[r.limit.kind]||''):'';
      if(r.limit&&r.limit.kind==='secondary'&&(r.status==='above'||r.status==='above_range'||r.status==='below_range')) s=[s[0],'warn'];
      h+='<tr><td>'+esc(r.input.name)+'<br><span class="small muted">'+esc(r.input.value)+' '+esc(r.input.unit==='pH'?'':(r.input.unit||''))+'</span></td>'+
        '<td class="small">'+(r.limit?esc(r.limit.label):'')+'</td><td class="small">'+esc(kind||r.note||'')+'</td>'+
        '<td><span class="chip '+s[1]+'">'+esc(s[0])+'</span></td><td>'+((r.limit&&r.limit.guide)||r.guide?link((r.limit&&r.limit.guide)||r.guide,'Guide'):'')+'</td></tr>';
    });
    h+='</tbody></table></div><p class="small muted" style="margin-top:8px">EPA limits apply to public water systems, not private wells. A result above a limit tells you which guide to read and what to retest; it is not a health assessment.</p>';
    return h+foot(d.page,'limits read from the EPA table page');
  }

  function viewItems(d){
    var h='<div class="eyebrow">'+esc(d.eyebrow||'Picks')+'</div><h1>'+esc(d.heading||'')+'</h1><div class="list">';
    (d.items||[]).forEach(function(it){
      h+='<div class="card"><h2>'+esc(it.name)+'</h2>'+(it.role?'<p class="small">'+esc(it.role)+'</p>':'')+(it.spec?'<p class="small muted">'+esc(it.spec)+'</p>':'')+
        (it.page?'<div class="small">'+link(it.page.url,it.page.title)+'</div>':'')+'</div>';
    });
    if(!(d.items||[]).length) h+='<p class="empty">Nothing matched.</p>';
    return h+'</div>'+foot(null,'every pick is justified on its page');
  }

  function viewPlan(d){
    var h='<div class="eyebrow">Home maintenance plan</div><h1>'+esc(d.heading||'What is due, and when')+'</h1>';
    h+='<div class="tbl"><table><thead><tr><th>Item</th><th>Task</th><th>Every</th><th>Due</th><th></th></tr></thead><tbody>';
    (d.rows||[]).forEach(function(r){
      var chip=r.overdue?'<span class="chip bad">Overdue</span> ':r.unknown_last?'<span class="chip warn">Check now</span> ':'';
      var every=r.every_months>=12&&r.every_months%12===0?(r.every_months/12)+' yr':r.every_months+' mo';
      h+='<tr><td>'+esc(r.label)+'</td><td class="small">'+esc(r.task)+'<br><span class="muted">'+esc(r.basis)+'</span></td><td class="num">'+every+'</td><td class="num">'+chip+esc(r.unknown_last?'':r.due)+'</td><td>'+link(r.page,'Source')+'</td></tr>';
    });
    h+='</tbody></table></div><p class="small muted" style="margin-top:8px">"Check now" means no last date was given. Tell the assistant when you last did it for a real due date.</p>';
    return h+foot(null,'intervals as the makers print them');
  }

  var modelTimer=null;
  function viewCalculator(d){
    var c=d.calculator||{};
    var h='<div class="eyebrow">Calculator</div><h1>'+esc(c.title||d.title||'')+'</h1>';
    if(d.summary) h+='<p class="small">'+esc(d.summary)+'</p>';
    h+='<div class="calc" id="calc-host"></div>';
    h+=foot(d.page,'same formula as the page');
    app.innerHTML=h;
    var host=document.getElementById('calc-host');
    var tmp=document.createElement('div');
    tmp.innerHTML=c.html||'';
    var scripts=[].slice.call(tmp.querySelectorAll('script'));
    scripts.forEach(function(s){ s.parentNode.removeChild(s); });
    while(tmp.firstChild) host.appendChild(tmp.firstChild);
    var pre=d.prefill||{};
    Object.keys(pre).forEach(function(k){
      var el=document.getElementById(c.id+'-'+k)||document.getElementById(k);
      if(!el) return;
      var v=String(pre[k]);
      if(el.tagName==='SELECT'){
        var opts=[].slice.call(el.options);
        var hit=opts.filter(function(o){return o.value===v;})[0]||opts.filter(function(o){return o.text.trim().toLowerCase()===v.toLowerCase();})[0]||opts.filter(function(o){return o.text.toLowerCase().indexOf(v.toLowerCase())===0;})[0];
        if(hit) el.value=hit.value;
      } else if(el.type==='checkbox'){ el.checked=!!pre[k]&&pre[k]!=='false'; }
      else el.value=v;
    });
    scripts.forEach(function(s){ var n=document.createElement('script'); n.textContent=s.textContent; host.appendChild(n); });
    function share(){
      var out=host.querySelector('output');
      if(!out) return;
      var fields=[].slice.call(host.querySelectorAll('input,select')).map(function(el){
        var lab=el.closest('label'); var name=lab?lab.textContent.replace(el.tagName==='SELECT'?el.textContent:'','').trim():el.id;
        var val=el.tagName==='SELECT'?el.options[el.selectedIndex].text:(el.type==='checkbox'?el.checked:el.value);
        return name+': '+val;
      });
      request('ui/update-model-context',{content:[{type:'text',text:'The user set the OwnerSpec "'+(c.title||'')+'" calculator to '+fields.join('; ')+'. It now shows: '+out.textContent.trim()+' Source: '+(d.page||'')}]}).catch(function(){});
    }
    host.addEventListener('input',function(){ clearTimeout(modelTimer); modelTimer=setTimeout(share,800); });
    host.addEventListener('change',function(){ clearTimeout(modelTimer); modelTimer=setTimeout(share,800); });
  }

  function render(result){
    var d=result&&result.structuredContent;
    lastData=d;
    if(!d||!d.view){
      var t=result&&result.content&&result.content[0]&&result.content[0].text;
      app.innerHTML='<p>'+esc(t||'No result.')+'</p>'+foot();
      return;
    }
    if(d.view==='calculator') return viewCalculator(d);
    app.innerHTML=d.view==='guides'?viewGuides(d):d.view==='report'?viewReport(d):d.view==='items'?viewItems(d):d.view==='plan'?viewPlan(d):'<p>'+esc(JSON.stringify(d))+'</p>';
  }

  window.addEventListener('message',function(e){
    if(e.source!==window.parent) return;
    var m=e.data;
    if(!m||m.jsonrpc!=='2.0') return;
    if(m.id!=null&&!m.method&&pending[m.id]){
      var p=pending[m.id]; delete pending[m.id];
      if(m.error) p.rej(new Error(m.error.message||'error')); else p.res(m.result);
      return;
    }
    if(m.method==='ui/notifications/tool-result') render(m.params);
    else if(m.method==='ui/notifications/host-context-changed') applyContext(m.params);
    else if(m.method==='ui/notifications/tool-cancelled'){ if(!lastData) app.innerHTML='<p class="empty">Cancelled.</p>'; }
    else if(m.method==='ui/resource-teardown'||m.method==='ping'){ if(m.id!=null) send({jsonrpc:'2.0',id:m.id,result:{}}); }
  });

  if('ResizeObserver' in window){
    var last=0;
    new ResizeObserver(function(){
      var h=Math.ceil(document.documentElement.scrollHeight);
      if(h!==last){ last=h; notify('ui/notifications/size-changed',{width:Math.ceil(document.documentElement.scrollWidth),height:h}); }
    }).observe(document.body);
  }

  request('ui/initialize',{appInfo:{name:'OwnerSpec',version:'1.0.0'},appCapabilities:{availableDisplayModes:['inline']},protocolVersion:'2026-01-26'})
    .then(function(r){ applyContext(r&&r.hostContext); notify('ui/notifications/initialized',{}); })
    .catch(function(){ notify('ui/notifications/initialized',{}); });
})();
</script>
</body>
</html>`;
