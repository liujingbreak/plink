import React, { useState, useCallback, useEffect, useRef } from 'react';
import classnames from 'classnames/bind';
import {getState, dispatcher} from './markdownSlice';
import {connect} from 'react-redux';
import {TOC} from '@wfh/doc-ui-common/isom/md-types';
import anime from 'animejs';
import './MarkdownIndex.scss';

const checkElementInView = (targetEl: HTMLElement) => {
  const windowHeight = window.screen.height;
  const clientRects = targetEl.getClientRects();
  return clientRects[0].top >= 0 && clientRects[0].top < (windowHeight / 2);
};
interface MarkdownIndexProps {
  mdKey: string;
  toc?: TOC[];
  contentRef: React.RefObject<HTMLDivElement>;
  scrollBodyEl?: HTMLDivElement | null;
  indexOpen?: boolean;
}
const MarkdownIndex = ({ mdKey, contentRef, toc, scrollBodyEl, indexOpen }: MarkdownIndexProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [isTop, setIsTop] = useState<boolean>(true);

  const toggleIndex = useCallback(() => {
    dispatcher.openIndex(!indexOpen);
  }, [indexOpen]);

  const handleToggle = useCallback(() => {
    setTimeout(() => {
      if (bodyRef.current && listRef.current) {
        if (!indexOpen) {
          bodyRef.current.style.height = '0px';
        } else {
          bodyRef.current.style.height = `${listRef.current.offsetHeight}px`;
        }
      }
    }, 0);
  }, [indexOpen, bodyRef, listRef]);

  const handleIndexItemClick = useCallback((item: TOC) => {
    const targetEl = document.getElementById(item.id);
    if (targetEl && scrollBodyEl) {
      const inView = checkElementInView(targetEl);
      const targetOffsetTop = targetEl.offsetTop;
      if (inView && isTop) {
        return;
      }
      dispatcher.openIndex(targetOffsetTop < 56);
      setTimeout(() => {
        const targetOffsetTopAfter = targetEl.offsetTop;
        anime({
          targets: scrollBodyEl,
          scrollTop: targetOffsetTopAfter - 120,
          duration: 300,
          easing: 'easeInOutQuad'
        });
      }, 300);
    }
  }, [indexOpen, isTop, scrollBodyEl]);

  const handleScroll = () => {
    if (scrollBodyEl) {
      const scrollTop = scrollBodyEl.scrollTop;
      setIsTop(scrollTop === 0);
      dispatcher.openIndex(!(scrollTop > 56 && indexOpen));
    }
  };

  useEffect(() => {
    if (listRef.current && contentRef.current) {
      contentRef.current.style.paddingTop = `${listRef.current.offsetHeight + 56}px`;
      handleToggle();
    }
  }, [mdKey, listRef, contentRef]);

  useEffect(() => {
    handleToggle();
  }, [indexOpen]);

  useEffect(() => {
    dispatcher.addScrollCallback(handleScroll);
  }, [scrollBodyEl]);

  return toc && toc.length > 0 ? (
    <div className={classnames({
      'md-index': true,
      isTop
    })} ref={wrapperRef}>
      <div className='md-index-head' onClick={toggleIndex}>
        <h2 className='md-index-title'>目录</h2>
        <i className='md-index-icon material-icons mdc-icon-button__icon mdc-icon-button__icon--on'>{indexOpen ? 'expand_less' : 'expand_more'}</i>
      </div>
      <div className={classnames({
        'md-index-content': true,
        open: indexOpen
      })} ref={bodyRef}>
        <ul className='md-index-list' ref={listRef}>
          {toc.map((item) => (
            <li
              key={item.id}
              // href={`#${item.id}`}
              className='md-index-link'
              onClick={() => handleIndexItemClick(item)}
            >{item.text}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;
};

function mapToPropFactory() {
  return function(rootState: any, props: MarkdownIndexProps) {
    return {
      ...props,
      toc: getState().contents[props.mdKey]?.toc || [],
      scrollBodyEl: getState().scrollBodyEl,
      indexOpen: getState().indexOpen
    };
  };
}
const connected = connect(mapToPropFactory)(MarkdownIndex);

export {connected as MarkdownIndex};
