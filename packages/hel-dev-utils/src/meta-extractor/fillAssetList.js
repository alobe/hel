/** @typedef {import('types/domain-inner').SrcMap} SrcMap*/
import fs from 'fs';
import util from 'util';
import { verbose } from '../inner-utils/index';
import { purify, isNull } from '../inner-utils/obj';
import { noDupPush } from '../inner-utils/arr';

const writeFile = util.promisify(fs.writeFile);

function getLinkType(appHomePage, srcOrHref) {
  if (srcOrHref.startsWith(appHomePage)) {
    return 'link';
  }
  return 'staticLink';
}


function getScriptType(appHomePage, srcOrHref) {
  if (srcOrHref.startsWith(appHomePage)) {
    return 'script';
  }
  return 'staticScript';
}


function needIgnore(parseOptions, /** @type string */srcOrHref, hreflang = '') {
  const { appHomePage, extractMode } = parseOptions;
  if (srcOrHref) {
    // 这种类型的css文件不忽略
    if (hreflang.startsWith('PRIV_CSS')) return false;
    if (srcOrHref.startsWith('http')) {
      if (extractMode === 'build') {
        return !srcOrHref.startsWith(appHomePage); // 不是以 appHomePage 开头的都忽略掉
      }
      if (extractMode === 'bu_st') {
        return false;  // 都不忽略，写 staticLink staticScript
      }
      throw new Error(`unknown extract_mode [${extractMode}]`);
    }
    // 以双斜杠开头的script引用直接忽略
    if (srcOrHref.startsWith('//')) return true;
    // 用户的子应用未能正确埋入 CMS_APP_HOME_PAGE，需要修改构建脚本的 publicPath 获取方式
    throw new Error(`src or href is invalid, it must refer to a cdn host, now it is ${srcOrHref}`);
  }
  // 控制不忽略，会尝试提取 innerHtml
  return false;
};


let custScriptIdx = 0;
async function writeInnerHtml(childDom, fileType, parseOptions) {
  const { buildDirFullPath, appHomePage } = parseOptions;
  const innerHTML = childDom.innerHTML;
  if (!innerHTML) return '';

  verbose(`found a user customized ${fileType} tag node in html, try extract its content and write them to local fs`);
  custScriptIdx++;
  const scriptName = `hel_userChunk_${custScriptIdx}.${fileType}`;
  const fileAbsolutePath = `${buildDirFullPath}/${scriptName}`;
  const fileWebPath = `${appHomePage}/${scriptName}`;

  await writeFile(fileAbsolutePath, innerHTML);
  verbose(`write done, the web file will be ${fileWebPath} later`);
  return fileWebPath;
};


/**
 * 提取link、script标签数据并填充到目标assetList
 * @param {HTMLCollectionOf<HTMLScriptElement>} doms
 * @param {SrcMap} fillTargets
 * @param {object} parseOptions
 * @param {string} parseOptions.buildDirFullPath
 * @param {boolean} parseOptions.isHead
 * @param {string} parseOptions.appHomePage
 */
export async function fillAssetList(doms, fillTargets, parseOptions) {
  const { headAssetList, bodyAssetList, chunkCssSrcList, privCssSrcList } = fillTargets;
  const assetList = parseOptions.isHead ? headAssetList : bodyAssetList;
  const cssList = chunkCssSrcList;
  const privCssList = privCssSrcList;

  const { appHomePage } = parseOptions;
  const len = doms.length;
  const replaceContentList = [];

  for (let i = 0; i < len; i++) {
    const childDom = doms[i];
    const { tagName, crossorigin } = childDom;
    let toPush = null;
    if (tagName === 'LINK') {
      const { as, rel, hreflang = '' } = childDom;
      let { href } = childDom;
      if (!href) continue;
      if (needIgnore(parseOptions, href, hreflang)) {
        verbose(`ignore href ${href}`);
        continue;
      }

      verbose(`analyze link href[${href}] as[${as}] rel[${rel}]`);
      // 供 shadow-dom 或其他需要知道当前应用所有样式列表的场景用
      if (href.endsWith('.css')) {
        noDupPush(cssList, href);
      }
      if (hreflang.startsWith('PRIV_CSS')) {
        noDupPush(privCssList, href);
      }
      // 一些使用了老版本cra的项目，这两个href 在修改了 publicPath 后也不被添加前缀，这里做一下修正
      const legacyHrefs = ['/manifest.json', '/favicon.ico'];
      if (legacyHrefs.includes(href)) {
        href = `${appHomePage}${href}`;
        replaceContentList.push({ toMatch: href, toReplace: href });
      }

      toPush = { tag: getLinkType(appHomePage, href), attrs: { href: href, as, rel, crossorigin } };
    } else if (tagName === 'SCRIPT') {
      const { src } = childDom;
      let targetSrc = src;
      if (!targetSrc) {
        targetSrc = await writeInnerHtml(childDom, 'js', parseOptions);
      }
      if (!targetSrc) continue;
      if (needIgnore(parseOptions, targetSrc)) {
        verbose(`ignore script ${targetSrc}`);
        continue;
      }

      verbose(`analyze script src[${targetSrc}]`);
      // 替换用户的 development 模式的 react 相关包体
      if (targetSrc.endsWith('react.dev.js')) {
        replaceContentList.push({ toMatch: targetSrc, toReplace: targetSrc.replace('react.dev.js', 'react.js') });
      }
      // 替换用户的 development 模式的 vue 相关包体
      if (targetSrc.endsWith('vue.dev.js')) {
        replaceContentList.push({ toMatch: targetSrc, toReplace: targetSrc.replace('vue.dev.js', 'vue.js') });
      }
      toPush = { tag: getScriptType(appHomePage, targetSrc), attrs: { src: targetSrc, crossorigin } };
    } else if (tagName === 'STYLE') {
      // style 标签转换为 css 文件存起来
      const linkHref = await writeInnerHtml(childDom, 'css', parseOptions);
      if (!linkHref) continue;

      verbose(`upload style content to ${linkHref} done`);
      toPush = { tag: getLinkType(appHomePage, linkHref), attrs: { href: linkHref, rel: 'stylesheet' } };
    }

    if (toPush) {
      const judgeValueValid = (value, key) => {
        if (key === 'crossorigin') return !isNull(value, { nullValues: [null, undefined] });
        return !isNull(value);
      };

      toPush.attrs = purify(toPush.attrs, judgeValueValid);
      assetList.push(toPush);
    }
  }

  return replaceContentList;
}
