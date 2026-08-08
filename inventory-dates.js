(() => {
  'use strict';
  const STORAGE_KEY='pantry-raccoon:v1';
  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch{return {};}}
  function save(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function pretty(value){if(!value)return'';const [y,m,d]=value.split('-').map(Number);if(!y||!m||!d)return value;return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(y,m-1,d));}
  function addDateField(kind,label,name){
    const form=document.querySelector(`[data-inventory-form="${kind}"]`);if(!form||form.elements[name])return;
    const input=document.createElement('input');input.type='date';input.name=name;input.setAttribute('aria-label',label);
    const button=form.querySelector('button[type="submit"]');form.insertBefore(input,button);
    form.addEventListener('submit',()=>{
      const itemName=form.elements.name?.value.trim(),dateValue=input.value;if(!itemName)return;
      setTimeout(()=>{const state=load(),list=state.inventories?.[kind];if(!Array.isArray(list))return;const matches=list.filter(item=>item.name===itemName),item=matches[matches.length-1];if(!item)return;item[name]=dateValue;save(state);decorateInventory();},0);
    },true);
  }
  function decorateInventory(){
    const state=load();
    for(const kind of ['fridge','freezer']){
      const list=state.inventories?.[kind]||[],container=document.getElementById(`${kind}List`);if(!container)continue;
      container.querySelectorAll('.inventory-item').forEach(card=>{
        const title=card.querySelector('strong')?.textContent?.trim(),item=list.find(x=>x.name===title);if(!item)return;
        let line=card.querySelector('.inventory-date-line');const value=kind==='fridge'?item.expirationDate:item.dateAdded;
        if(!value){line?.remove();return;}
        if(!line){line=document.createElement('small');line.className='inventory-date-line';const details=card.querySelector('div > small');(details?.parentElement||card).appendChild(line);}
        line.textContent=kind==='fridge'?`Expires ${pretty(value)}`:`Added ${pretty(value)}`;
      });
    }
  }
  function start(){
    addDateField('fridge','Expiration date','expirationDate');addDateField('freezer','Date added','dateAdded');
    const observer=new MutationObserver(decorateInventory);['fridgeList','freezerList'].forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true});});decorateInventory();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
