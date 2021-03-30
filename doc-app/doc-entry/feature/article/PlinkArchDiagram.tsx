import React from 'react';
import ReactDom from 'react-dom';
import classnames from 'classnames/bind';
import {connect} from 'react-redux';
import styles from './PlinkArchDiagram.module.scss';
import {getState, Block} from './blockDiagramSlice';

const cx = classnames.bind(styles);
const layerCls = cx('layer');
const blockCls = cx('block');
const diagramTableCls = cx('diagramTable');

export type PlinkArchDiagramProps = React.PropsWithChildren<{
  containerDom: Element;
  dataKey: string;
}>;

const PlinkArchDiagram: React.FC<ReturnType<ReturnType<typeof mapToPropsFactory>>> = function(props) {
  // const props = props0 as ReturnType<ReturnType<typeof mapToPropsFactory>>;
  const diagram = (<div className={diagramTableCls}>
    {props.data.map(row => {
      return renderBlock(row);
    })}
  </div>);

  return ReactDom.createPortal(diagram, props.containerDom);
};

function mapToPropsFactory() {
  return function mapToProps(rootState: unknown, ownProps: PlinkArchDiagramProps) {
    const blocks = getState()[ownProps.dataKey];
    return {
      ...ownProps,
      data: blocks || ([] as Block[])
    };
  };
}

const Connected = connect(mapToPropsFactory)(PlinkArchDiagram);
export {Connected as PlinkArchDiagram};

function renderBlock(block: Block | string) {
  if (typeof block === 'string') {
    return <div key={block} className={blockCls + ' empty'}>{block}</div>;
  }
  if (block.type === 'layer')
    return <div key={block.title} className={layerCls} style={block.grow ? {flexGrow: block.grow} : {}}>
      <span className='title'>{block.title}</span>
      <span className='content'>{
        block.children ? block.children.map(child => renderBlock(child)) : ''
      }</span>
    </div>;
  else
    return <div key={block.title} className={blockCls + ' ' + block2Class(block)} style={block.grow ? {flexGrow: block.grow} : {}}>
      {
        block.content ?
          <span className='content no-children' dangerouslySetInnerHTML={{__html: block.content.replace(/\n/g, '<br>')}}></span>:
          <span className={'content ' + (block.chrInHorizontal ? 'horiztontal' : '')}>
            {block.children ? block.children.map(child => renderBlock(child)): ''}
          </span>
      }
    <span className='title' dangerouslySetInnerHTML={{__html: block.title}}></span>
  </div>;
}

function block2Class(block: Block) {
  if (block.children) {
    return 'has-children';
  } else if (block.content) {
    return 'has-content';
  } else {
    return 'empty';
  }
}

