import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';
import SubMenu from './SubMenu';
import { getWidth } from './util';

class DOMWrap extends React.Component {
  state = {
    lastVisibleIndex: undefined,
  };

  componentDidMount() {
    this.setChildrenWidthAndResize();
    window.addEventListener('resize', this.debouncedHandleResize, { passive: true });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.children !== this.props.children
      || prevProps.overflowedIndicator !== this.props.overflowedIndicator
    ) {
      this.setChildrenWidthAndResize();
    }
  }

  componentWillUnmount() {
    this.debouncedHandleResize.cancel();
    window.removeEventListener('resize', this.debouncedHandleResize);
  }

  getOverflowedSubMenuItem = (keyPrefix, overflowedItems) => {
    const { lastVisibleIndex } = this.state;
    const { overflowedIndicator, level, mode, prefixCls, theme, style: propStyle } = this.props;
    if (level !== 1 || mode !== 'horizontal') {
      return null;
    }
    // put all the overflowed item inside a submenu
    // with a title of overflow indicator ('...')
    const copy = this.props.children[0];
    const { children: throwAway, title, eventKey, ...rest } = copy.props;

    let style = { ...propStyle };

    if (overflowedItems.length === 0) {
      style = {
        ...style,
        display: 'none',
      };
    }

    const popupClassName = theme ? `${prefixCls}-${theme}` : '';

    return (
      <SubMenu
        title={overflowedIndicator}
        className={`${prefixCls}-overflowed-submenu`}
        popupClassName={popupClassName}
        {...rest}
        key={`${keyPrefix}-overflowed-indicator`}
        eventKey={`${keyPrefix}-overflowed-indicator`}
        disabled={false}
        style={style}
      >
        {overflowedItems}
      </SubMenu>
    );
  }

  // memorize rendered menuSize
  setChildrenWidthAndResize() {
    if (this.props.mode !== 'horizontal') {
      return;
    }
    const ul = ReactDOM.findDOMNode(this);

    if (!ul) {
      return;
    }

    this.childrenSizes = [];
    const { children } = this.props;

    this.childrenSizes = children.map((c, i) => getWidth(ul.children[2*i]));

    this.overflowedIndicatorWidth = getWidth(ul.children[children.length]);
    this.originalTotalWidth = this.childrenSizes.reduce((acc, cur) => acc + cur, 0);
    this.handleResize();
  }

  // original scroll size of the list
  originalTotalWidth = 0;

  // copy of overflowed items
  overflowedItems = [];

  // cache item of the original items (so we can track the size and order)
  childrenSizes = [];

  handleResize = () => {
    if (this.props.mode !== 'horizontal') {
      return;
    }

    const ul = ReactDOM.findDOMNode(this);
    const width = getWidth(ul);

    this.overflowedItems = [];
    let currentSumWidth = 0;
    const children = this.props.children;

    // index for last visible child in horizontal mode
    let lastVisibleIndex = undefined;

    if (this.originalTotalWidth > width) {
      lastVisibleIndex = -1;

      this.childrenSizes.forEach(liWidth => {
        currentSumWidth += liWidth;
        if (currentSumWidth + this.overflowedIndicatorWidth <= width) {
          lastVisibleIndex++;
        }
      });

      children.slice(lastVisibleIndex + 1).forEach(c => {
        // children[index].key will become '.$key' in clone by default,
        // we have to overwrite with the correct key explicitly
        this.overflowedItems.push(React.cloneElement(
          c,
          { key: c.props.eventKey, mode: 'vertical-left' },
        ));
      });
    }

    this.setState({ lastVisibleIndex });
  }

  debouncedHandleResize = debounce(this.handleResize, 150);

  renderChildren(children) {
    // need to take care of overflowed items in horizontal mode
    const { lastVisibleIndex } = this.state;
    return children.reduce((acc, childNode, index) => {
      let item = childNode;
      if (this.props.mode === 'horizontal') {
        let overflowed = this.getOverflowedSubMenuItem(childNode.props.eventKey, []);

        if (lastVisibleIndex !== undefined
            &&
            this.props.className.indexOf(`${this.props.prefixCls}-root`) !== -1
        ) {
          if (index > lastVisibleIndex) {
            item = React.cloneElement(
              childNode,
              // 这里修改 eventKey 是为了防止隐藏状态下还会触发 openkeys 事件
              { style: { visibility: 'hidden' }, eventKey: `${childNode.props.eventKey}-hidden` },
            );
          } else if (index === lastVisibleIndex) {
            overflowed = this.getOverflowedSubMenuItem(childNode.props.eventKey, this.overflowedItems);
          }
        }

        return [...acc, item, overflowed];
      }
      return [...acc, item];
    }, []);
  }

  render() {
    const {
      hiddenClassName,
      visible,
      prefixCls,
      overflowedIndicator,
      mode,
      level,
      tag: Tag,
      children,
      theme,
      ...rest,
    } = this.props;

    const { lastVisibleIndex } = this.state;

    if (!visible) {
      rest.className += ` ${hiddenClassName}`;
    }

    return (
      <Tag {...rest}>
        {this.renderChildren(this.props.children)}
      </Tag>
    );
  }
}

DOMWrap.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
  mode: PropTypes.oneOf(['horizontal', 'vertical', 'vertical-left', 'vertical-right', 'inline']),
  prefixCls: PropTypes.string,
  level: PropTypes.number,
  theme: PropTypes.string,
  overflowedIndicator: PropTypes.node,
  visible: PropTypes.bool,
  hiddenClassName: PropTypes.string,
  tag: PropTypes.string,
  style: PropTypes.object,
};

DOMWrap.defaultProps = {
  tag: 'div',
  className: '',
};

export default DOMWrap;
