(function(){
  var book=document.getElementById('book'),pages=[].slice.call(book.querySelectorAll('.pg')),cnt=document.getElementById('count'),prev=document.getElementById('prev'),next=document.getElementById('next'),cur=0;
  function at(){var c=book.scrollLeft+book.clientWidth/2,best=0,d=1e9;pages.forEach(function(p,i){var m=p.offsetLeft+p.offsetWidth/2,x=Math.abs(m-c);if(x<d){d=x;best=i}});return best}
  function upd(){cur=at();cnt.textContent=(cur+1)+' / '+pages.length;prev.disabled=cur===0;next.disabled=cur===pages.length-1}
  function go(i){i=Math.max(0,Math.min(pages.length-1,i));pages[i].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}
  prev.addEventListener('click',function(){go(cur-1)});next.addEventListener('click',function(){go(cur+1)});
  book.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();go(cur+1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(cur-1)}});
  var t;book.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(upd,60)},{passive:true});
  window.addEventListener('resize',upd);upd();
})();
