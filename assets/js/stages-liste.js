/* Trouver son stage : imprimer et partager « ma liste » (pages départements et « autour de chez moi »).
   Rien n'est envoyé à 2A Formation : l'impression se fait dans le navigateur, le lien de partage ne contient que les numéros FINESS. */
(function(){
  var esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  function ensureStyle(){
    if(document.getElementById('impr-style')) return;
    var s=document.createElement('style'); s.id='impr-style';
    s.textContent='#impr{display:none}@media print{body>*:not(#impr){display:none!important}#impr{display:block;font:11pt/1.35 Arial,sans-serif;color:#000}'+
      '#impr h1{font-size:16pt;margin:0 0 4pt}#impr p{margin:0 0 8pt}#impr table{width:100%;border-collapse:collapse}#impr th,#impr td{border:1px solid #888;padding:4pt 5pt;vertical-align:top;text-align:left}'+
      '#impr th{background:#e8efe9}#impr td.c{width:34pt;text-align:center}#impr small{color:#444}#impr tr{page-break-inside:avoid}#impr .pied{margin-top:10pt;font-size:8.5pt;color:#444}@page{size:A4 landscape;margin:12mm}}';
    document.head.appendChild(s);
  }
  window.imprimerListe=function(rows,titre){
    ensureStyle();
    var old=document.getElementById('impr'); if(old) old.remove();
    var d=document.createElement('div'); d.id='impr';
    var dist=rows.some(function(r){return r.km!=null;});
    var h='<h1>'+esc(titre||'Ma liste de structures pour mon stage')+'</h1><p>'+rows.length+(rows.length>1?' structures':' structure')+' · imprimée le '+new Date().toLocaleDateString('fr-FR')+' · Cochez au fur et à mesure.</p>'+
      '<table><thead><tr><th>Structure</th><th>Adresse</th><th>Téléphone</th>'+(dist?'<th>Dist.</th>':'')+'<th>Appel</th><th>Envoi</th><th>Relance</th><th>Réponse / notes</th></tr></thead><tbody>';
    var REP={entretien:'Entretien',accepte:'Acceptée',refuse:'Refusée',sans:'Pas de réponse'};
    var bx=function(d){return d?'☑ <small>'+esc(d.split('-').reverse().join('/'))+'</small>':'☐';};
    rows.forEach(function(r){ var t=r.dt||{};
      h+='<tr><td><b>'+esc(r.n)+'</b><br><small>'+esc(r.t)+'</small></td><td>'+esc((r.a?r.a+', ':'')+r.cp+' '+r.v)+'</td><td>'+esc(r.p||'')+'</td>'+(dist?'<td>'+(r.km!=null?esc(String(r.km).replace('.',','))+' km':'')+'</td>':'')+'<td class="c">'+bx(t.appele)+'</td><td class="c">'+bx(t.envoye)+'</td><td class="c">'+bx(t.relance)+'</td><td style="width:22%">'+esc(REP[r.st]||'')+'</td></tr>';
    });
    h+='</tbody></table><p class="pied">Coordonnées : répertoire FINESS (data.gouv.fr, Licence Ouverte, extraction du 04/05/2026), à vérifier avant d\'appeler. Liste préparée gratuitement sur 2aformation.com/trouver-son-stage, par 2A Formation.</p>';
    d.innerHTML=h; document.body.appendChild(d);
    setTimeout(function(){window.print();},50);
    try{if(window.goatcounter&&window.goatcounter.count) window.goatcounter.count({path:'impression-liste-stages',title:'Impression liste stages',event:true});}catch(e){}
  };
  window.partagerListe=function(ids,base,btn){
    var url=base+'#liste='+ids.join(',');
    var txt='Ma liste de structures pour chercher un stage dans le social';
    var done=function(){ if(btn){var l=btn.textContent; btn.textContent='✓ Lien copié'; setTimeout(function(){btn.textContent=l;},2200);} };
    try{if(window.goatcounter&&window.goatcounter.count) window.goatcounter.count({path:'partage-liste-stages',title:'Partage liste stages',event:true});}catch(e){}
    if(navigator.share){ navigator.share({title:txt,text:txt,url:url}).catch(function(){}); return; }
    (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(done).catch(function(){window.prompt('Copiez ce lien et envoyez-le :',url);});
  };
})();
