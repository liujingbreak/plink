import React from 'react';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
// import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
import styles from './MediaMatch.module.scss';

export type Size = 'desktop' | 'tablet' | 'phone';

export type MediaMatchProps = React.PropsWithChildren<{
  onChange(size: Size): void;
}>;

const MediaMatch: React.FC<MediaMatchProps> = function(props) {
  // React.useEffect(() => {
  //   console.log(styleText);
  // }, []);
  const detectorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const resizeEvent$ = new rx.Subject();
    const sub = resizeEvent$.pipe(
      op.throttleTime(500),
      op.concatMap(() => rx.timer(20)),
      op.tap(() => {
        if (detectorRef.current) {
          const content = window.getComputedStyle(detectorRef.current, '::before').content;
          props.onChange(content.replace(/^["']|["']$/g, '') as Size);
          // console.log(window.getComputedStyle(detectorRef.current, '::before').content);
        }
      })
    ).subscribe();

    function onResize() {
      resizeEvent$.next();
    }
    window.addEventListener('resize', onResize);

    onResize();
    return () => {
      window.removeEventListener('resize', onResize);
      sub.unsubscribe();
    };
  }, [props]);
  return <div ref={detectorRef} className={styles.MediaMatch}></div>;
  // return <></>;
};


export {MediaMatch};



