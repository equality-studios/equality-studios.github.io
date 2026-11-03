import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const origin = new URL(config.origin).origin;
const basePath = config.basePath.replace(/\/+$/, '');
if (basePath && !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('Invalid GitHub Pages base path');
const siteUrl = origin + basePath;
const appPath = path.join(root, 'source/original-app.js');
let app = readFileSync(appPath, 'utf8');
function replaceOnce(before, after) {
  if (!app.includes(before)) throw new Error(`Original content changed: ${before.slice(0, 100)}`);
  app = app.replace(before, after);
}

// Preserve the supplied React application and styling. Exclude unused builder UI.
const end = app.indexOf('var Tt=class');
if (end < 0) throw new Error('Unable to locate application boundary');
app = app.slice(0, end);
app = `import { createNewsComponents } from './news.js';\n` + app;
replaceOnce('group:`https://www.roblox.com/share/g/671879338`', 'group:`https://www.roblox.com/communities/671879338/Equality-Studios`');
replaceOnce('[`Updates`,`/updates`]],st=', '[`Updates`,`/updates`],[`Equality News`,`/news`]],st=');
const headerStart = app.indexOf('function lt()');
const headerEnd = app.indexOf('function ut()', headerStart);
if (headerStart < 0 || headerEnd < 0) throw new Error('Unable to locate the original header');
app = app.slice(0, headerStart) + readFileSync(path.join(root, 'source/header.js'), 'utf8') + '\n' + app.slice(headerEnd);
replaceOnce('(0,D.jsxs)(`span`,{children:[`8stvy`,(0,D.jsx)(`span`,{className:`brand-sub`,children:`EQUALITY STUDIOS`})]})', '(0,D.jsx)(`span`,{children:`Equality Studios`})');
// Existing pages stay intact. Surface the new journal on the home and studio pages.
replaceOnce('function gt(){return', 'function gt(){return');
const homeEnd = '(0,D.jsx)(ht,{})]})}function _t';
replaceOnce(homeEnd, '(0,D.jsx)(equalityNews.Preview,{}),(0,D.jsx)(ht,{})]})}function _t');
replaceOnce('(0,D.jsx)(ft,{})]})]})}function St()', '(0,D.jsx)(ft,{})]}),(0,D.jsx)(equalityNews.Preview,{compact:true})]})}function St()');
replaceOnce('function wt(){let[e]=Se(),t;switch(e)', 'function wt(){let[e]=Se();e=normalizePath(e);let t;switch(e)');
replaceOnce('case`/updates`:t=(0,D.jsx)(Ct,{});break;default:', 'case`/updates`:t=(0,D.jsx)(Ct,{});break;case`/news`:t=(0,D.jsx)(equalityNews.Hub,{});break;default:if(e.startsWith(`/news/`)){t=(0,D.jsx)(equalityNews.Article,{slug:e.slice(6),key:e});break;}');
replaceOnce('id:`main`,className:`site-main`', 'id:`main`,tabIndex:-1,className:`site-main`');
// Explicit UTC prevents the source timestamp from being mistaken for local time.
app = app.replaceAll('October 30, 2026', 'October 30, 2026 (UTC)');
// Support both organization root sites and GitHub project paths.
app = app.replaceAll('/images/', basePath + '/images/');
app += `
function normalizePath(value){return value.replace(/\\/+$/, '') || '/'}
function isActive(current,target){return current===target||(target!=='/'&&current.startsWith(target+'/'))}
const equalityNews=createNewsComponents({React:_,Link:we,External:k,Intro:_t,Eyebrow:A,Community:ht});
function pageTitle(value){
  const article=equalityNews.articles.find(item=>value==='/news/'+item.slug);
  const label=article?.title || ot.find(item=>item[1]===value)?.[0] || (value==='/games/the-huss-rooms'?'The Huss Rooms':'Page not found');
  return label==='Home'||label==='Equality Studios'?'Equality Studios':label+' — Equality Studios';
}
function updateMetadata(value){
  const article=equalityNews.articles.find(item=>value==='/news/'+item.slug);
  const description=article?.summary || (value==='/news'?'Equality News: game updates, studio notes, and creator connections from Equality Studios.':'The creator hub for 8stvy, owner of Equality Studios and 8stxys on YouTube and TikTok. Explore The Huss Rooms, content, and community.');
  const url=${JSON.stringify(siteUrl)}+value;
  for(const [selector,content] of [['meta[name="description"]',description],['meta[property="og:description"]',description],['meta[property="og:title"]',document.title],['meta[property="og:url"]',url]]){const element=document.querySelector(selector);if(element)element.content=content}
  const canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href=url;
}
(0,v.createRoot)(document.getElementById('root')).render((0,D.jsx)(_.StrictMode,{children:(0,D.jsx)(Ce,{base:${JSON.stringify(basePath)},children:(0,D.jsx)(wt,{})})}));
`;
writeFileSync(path.join(root,'dist/assets/app.js'),app);
writeFileSync(path.join(root,'dist/assets/site-config.js'),`export const basePath = ${JSON.stringify(basePath)};\nexport function assetPath(value) { return basePath + value; }\n`);

const pages={
  '/':['Home','The creator hub for 8stvy and Equality Studios. Discover The Huss Rooms, videos, news, and community.'],
  '/about':['About','Meet 8stvy, owner of Equality Studios and 8stxys on YouTube and TikTok.'],
  '/games':['Games','Explore Roblox experiences from Equality Studios, including The Huss Rooms.'],
  '/games/the-huss-rooms':['The Huss Rooms','Explore The Huss Rooms from Equality Studios: artwork, update notes, and a direct Roblox link.'],
  '/studio':['Equality Studios','Equality Studios: the Roblox group, the games, and the Discord community owned by 8stvy.'],
  '/videos':['Videos','Watch selected YouTube Shorts and find 8stxys on YouTube and TikTok.'],
  '/updates':['Updates','A sourced record of The Huss Rooms updates and Equality Studios announcements.'],
  '/news':['Equality News','Game updates, studio notes, and creator connections from Equality Studios.']
};
const { newsArticles }=await import('../dist/assets/news-data.js');
for(const item of newsArticles)pages['/news/'+item.slug]=[item.title,item.summary];
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function html(route,title,description){return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title==='Home'||title==='Equality Studios'?'Equality Studios':escape(title)+' — Equality Studios'}</title><meta name="theme-color" content="#0b0c14">
<meta name="description" content="${escape(description)}"><link rel="canonical" href="${siteUrl}${route}">
<meta property="og:title" content="${title==='Home'||title==='Equality Studios'?'Equality Studios':escape(title)+' — Equality Studios'}"><meta property="og:description" content="${escape(description)}">
<meta property="og:type" content="${route.startsWith('/news/')?'article':'website'}"><meta property="og:url" content="${siteUrl}${route}">
<meta property="og:image" content="${siteUrl}/images/game.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${basePath}/images/studio.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${basePath}/assets/site.css"><link rel="stylesheet" href="${basePath}/assets/improvements.css"><script type="module" src="${basePath}/assets/app.js"></script>
</head><body><div id="root"></div><noscript><main style="padding:40px;background:#0b0c14;color:#eee;font-family:Arial;min-height:100vh"><h1>Equality Studios</h1><p>Please enable JavaScript to explore the games, videos, and Equality News.</p><a style="color:#b59aff" href="https://www.roblox.com/communities/671879338/Equality-Studios">Visit Equality Studios on Roblox</a></main></noscript></body></html>`}
for(const [route,[title,description]] of Object.entries(pages)){
  const directory=path.join(root,'dist',route);mkdirSync(directory,{recursive:true});writeFileSync(path.join(directory,'index.html'),html(route,title,description));
}
writeFileSync(path.join(root,'dist/404.html'),html('/404','Page not found','Find games, videos, Equality News, and the Equality Studios community.'));
// GitHub Pages serves the generated per-route HTML, with a custom fallback page.
rmSync(path.join(root,'dist/_redirects'),{force:true});
writeFileSync(path.join(root,'dist/.nojekyll'),'');
writeFileSync(path.join(root,'dist/robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
writeFileSync(path.join(root,'dist/sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(pages).map(route=>`<url><loc>${siteUrl}${route}</loc></url>`).join('')}</urlset>`);
console.log(`Prepared ${Object.keys(pages).length} pages, with original assets and Equality News.`);
