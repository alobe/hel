import type { IInnerRemoteModuleProps, ILocalCompProps } from '../types';
import type { ISubAppVersion } from 'hel-types';
import React from 'react';
import core from 'hel-micro-core';
import { appStyleSrv, preFetchApp, preFetchLib } from 'hel-micro';
import defaults from '../consts/defaults';

const { helLoadStatus } = core;

export interface IFetchOptions {
  platform: string,
  appendCss?: boolean,
  setStyleAsString?: boolean,
  versionId?: string,
  enableDiskCache?: boolean,
  onAppVersionFetched?: (appVersion: ISubAppVersion) => any,
  extraCssUrlList?: string[],
  getExcludeCssList?: IInnerRemoteModuleProps['getExcludeCssList'],
};


export function ensurePropsDefaults(props: IInnerRemoteModuleProps) {
  const ensuredProps = { ...props };

  ensuredProps.isLib = props.isLib ?? false;
  ensuredProps.shadow = props.shadow ?? defaults.SHADOW;
  ensuredProps.setStyleAsString = props.setStyleAsString ?? defaults.SET_STYLE_AS_STRING;
  // 是否需要样式字符串（仅针对shadow配置有效）
  const needStyleStr = ensuredProps.shadow && ensuredProps.setStyleAsString;
  // 如果未显式设置是否 appendCss 值，appendCss 默认值受是否需要样式字符串 needStyleStr 值影响，需要样式字符串则不附加，反正则附加
  // 点击 props.appendCss 可进一步查看详细的默认值生成规则说明
  ensuredProps.appendCss = props.appendCss ?? (!needStyleStr);
  ensuredProps.compProps = props.compProps || {};
  ensuredProps.children = ensuredProps.compProps.children;
  ensuredProps.isLegacy = props.isLegacy ?? false;

  return ensuredProps;
}


export function getErrResult(props: ILocalCompProps, errMsg: string) {
  const ErrorView = props.Error
    || (() => <h1 style={defaults.H1_STYLE}>Hel MicroComp error: {errMsg}</h1>);
  return {
    RemoteModule: () => <ErrorView errMsg={errMsg} />,
    styleStr: '',
    styleUrlList: [],
    moduleReady: false,
  };
}


export function getFetchingResult(SkeletonView: any) {
  return {
    RemoteModule: SkeletonView,
    styleStr: '',
    styleUrlList: [],
    moduleReady: false,
  };
}


/**
 * 拉取远程组件样式核心逻辑
 * 标记执行中 ---> 开启骨架屏 ---> 异步拉取组件样式 ---> 拉取结束触发forceUpdate
 */
export function fetchLocalCompStyleStr(styleUrlList: string[], ctx: any) {
  const { fetchStyleStatusRef, setErrMsg, SkeletonView, setStyleStr } = ctx;
  const fetStyleStatus = fetchStyleStatusRef.current;
  // 还在执行中，依然返回骨架屏
  if (fetStyleStatus === helLoadStatus.LOADING) {
    return getFetchingResult(SkeletonView);
  }

  fetchStyleStatusRef.current = helLoadStatus.LOADING;
  // 异步拉取样式函数 
  appStyleSrv.fetchStyleByUrlList(styleUrlList).then((str) => {
    fetchStyleStatusRef.current = helLoadStatus.LOADED;
    setStyleStr(str);
  }).catch(err => {
    fetchStyleStatusRef.current = helLoadStatus.LOADED;
    setErrMsg(err.message || 'err occurred while fetch component style');
  });

  // 返回骨架屏
  return getFetchingResult(SkeletonView);
}


/**
 * 拉取远程组件样式核心逻辑
 * 标记执行中 ---> 开启骨架屏 ---> 异步拉取组件样式 ---> 拉取结束触发forceUpdate
 */
export function fetchRemoteModuleStyle(props: IInnerRemoteModuleProps, ctx: any) {
  const { isLoadAppStyleExecutingRef, setErrMsg, SkeletonView, forceUpdate, fetchOptions } = ctx;
  // 还在执行中，依然返回骨架屏
  if (isLoadAppStyleExecutingRef.current) {
    return getFetchingResult(SkeletonView);
  }

  isLoadAppStyleExecutingRef.current = true;
  // 异步拉取样式函数 
  appStyleSrv.fetchStyleStr(props.name, fetchOptions).then(() => {
    isLoadAppStyleExecutingRef.current = false;
    forceUpdate();
  }).catch(err => {
    isLoadAppStyleExecutingRef.current = false;
    setErrMsg(err.message || 'err occurred while fetch component style');
  });

  // 返回骨架屏
  return getFetchingResult(SkeletonView);
}

/**
 * 拉取远程组件核心逻辑
 * 标记执行中 ---> 开启骨架屏 ---> 异步拉取组件 ---> 拉取结束触发 forceUpdate
 */
export function fetchRemoteModule(props: IInnerRemoteModuleProps, ctx: any) {
  const { isLoadAppDataExecutingRef, setErrMsg, SkeletonView, forceUpdate, fetchOptions } = ctx;
  // 还在执行中，依然返回骨架屏
  if (isLoadAppDataExecutingRef.current) {
    return getFetchingResult(SkeletonView);
  }

  isLoadAppDataExecutingRef.current = true;
  // 声明拉取函数
  const doPreFetch = async () => {
    if (props.isLib) return preFetchLib(props.name, fetchOptions);
    return preFetchApp(props.name, fetchOptions);
  };

  // 开始执行异步获取组件操作
  doPreFetch().then((emitAppOrLib) => {
    if (!emitAppOrLib) {
      return setErrMsg('no component fetched');
    }
    isLoadAppDataExecutingRef.current = false;
    forceUpdate();
  }).catch(err => {
    isLoadAppDataExecutingRef.current = false;
    setErrMsg(err.message || 'err occurred while fetch component');
  });

  // 返回骨架屏
  return getFetchingResult(SkeletonView);
}



export function extractOptionsFromProps(props: IInnerRemoteModuleProps): IFetchOptions {
  const platform = props.platform || core.getPlatform();
  const versionId = props.versionId;
  const extraCssUrlList = props.extraCssUrlList || [];
  return {
    platform,
    versionId,
    appendCss: props.appendCss,
    getExcludeCssList: props.getExcludeCssList,
    setStyleAsString: props.setStyleAsString,
    enableDiskCache: props.enableDiskCache,
    onAppVersionFetched: props.onAppVersionFetched,
    extraCssUrlList,
  };
}
