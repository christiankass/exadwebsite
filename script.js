
document.addEventListener("DOMContentLoaded",()=>{
  const menu=document.querySelector(".menu"), nav=document.querySelector("nav");
  if(menu) menu.addEventListener("click",()=>{nav.style.display=nav.style.display==="flex"?"none":"flex";nav.style.flexDirection="column";nav.style.position="absolute";nav.style.top="74px";nav.style.left="0";nav.style.right="0";nav.style.padding="20px";nav.style.background="#06101d";});
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{
    const el=document.querySelector(a.getAttribute("href")); if(el){e.preventDefault();el.scrollIntoView({behavior:"smooth"});}
  }));
});
