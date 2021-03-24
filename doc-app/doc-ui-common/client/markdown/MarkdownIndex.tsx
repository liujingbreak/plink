import React, { useState, useCallback, useEffect, useRef } from 'react';
import classnames from 'classnames/bind';
import {getState, dispatcher} from './markdownSlice';
import {connect} from 'react-redux';
import {RippleComp} from '@wfh/doc-ui-common/client/material/RippleComp';
import {TOC} from '@wfh/doc-ui-common/isom/md-types';
import debounce from 'lodash/debounce';
import anime from 'animejs';
import './MarkdownIndex.scss';

const checkElementInView = (targetEl: HTMLElement) => {
  const windowHeight = window.screen.height;
  const clientRects = targetEl.getClientRects();
  return clientRects[0].top >= 0 && clientRects[0].top < (windowHeight / 2);
};
interface MarkdownIndexProps {
  mdKey: string;
  scrollRef: React.RefObject<HTMLDivElement>;
  toc?: TOC[];
}
const MarkdownIndex = ({ mdKey, scrollRef, toc }: MarkdownIndexProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState<boolean>(true);
  const [isTop, setIsTop] = useState<boolean>(true);
  const [wrapperHeight, setWrapperHeight] = useState<number>(0);
  const toggleIndex = useCallback(() => {
    setOpen(!open);
  }, [open]);

  const handleToggle = useCallback(() => {
    setTimeout(() => {
      if (bodyRef.current && listRef.current) {
        if (!open) {
          bodyRef.current.style.height = '0px';
        } else {
          bodyRef.current.style.height = `${listRef.current.offsetHeight}px`;
        }
      }
    }, 0);
  }, [open, bodyRef, listRef]);

  const handleIndexItemClick = useCallback((item: TOC) => {
    const targetEl = document.getElementById(item.id);
    if (targetEl && scrollRef.current) {
      const inView = checkElementInView(targetEl);
      const targetOffsetTop = targetEl.offsetTop;
      if (inView && isTop) {
        return;
      }
      if (targetOffsetTop < 56) {
        setOpen(true);
      } else {
        setOpen(false);
      }
      setTimeout(() => {
        const targetOffsetTopAfter = targetEl.offsetTop;
        anime({
          targets: scrollRef.current,
          scrollTop: targetOffsetTopAfter - 120,
          duration: 300,
          easing: 'easeInOutQuad'
        });
      }, 300);
    }
  }, [open, isTop, scrollRef]);

  const handleScroll = debounce(() => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      if (scrollTop === 0) {
        setIsTop(true);
      } else {
        setIsTop(false);
      }

      if (scrollTop > 56 && open) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    }
  }, 15);

  useEffect(() => {
    setTimeout(() => {
      console.log('wrapperRef: ', wrapperRef, scrollRef);
      if (wrapperRef.current && scrollRef.current) {
        scrollRef.current.style.paddingTop = `${wrapperRef.current.offsetHeight}px`;
        setWrapperHeight(wrapperRef.current.offsetHeight);
      }
    }, 100);
  }, [mdKey, wrapperRef, scrollRef]);

  useEffect(() => {
    handleToggle();
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return toc && toc.length > 0 ? (
    <div className={classnames({
      'md-index': true,
      isTop
    })} ref={wrapperRef}>
      <RippleComp>
        <div className='md-index-head' onClick={toggleIndex}>
          <h2 className='md-index-title'>目录</h2>
          <i className='md-index-icon material-icons mdc-icon-button__icon mdc-icon-button__icon--on'>{open ? 'expand_less' : 'expand_more'}</i>
        </div>
      </RippleComp>
      <div className={classnames({
        'md-index-content': true,
        open
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
      toc: getState().toc
    };
  };
}
const connected = connect(mapToPropFactory)(MarkdownIndex);

export {connected as MarkdownIndex};
