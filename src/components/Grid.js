import React, { Component, PropTypes } from 'react';

import GridPlot from './GridPlot';
import PurchasePlot from './PurchasePlot';
import ZoomControl from '../components/ZoomControl';

export default class Grid extends Component {
  mouseOut() {
    // Reset the hover once the mouse leaves this area
    this.props.actions.hoverOverPlot(-1);
  }

  overlayMouseDown(e) {
    const scale = this.props.scale;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().x;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().y;
    this.props.actions.startDraggingRect(Math.round(x / scale), Math.round(y / scale));
    e.stopPropagation();
  }

  overlayMouseMove(e) {
    const scale = this.props.scale;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().x;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().y;
    this.props.actions.resizeDraggingRect(Math.round(x / scale), Math.round(y / scale));
    e.stopPropagation();
  }

  overlayMouseUp(e) {
    this.props.actions.stopDraggingRect();
    e.stopPropagation();
  }

  render() {
    const scale = this.props.scale;

    const plots = this.props.plots.map((plot, index) => {
      return (<GridPlot scale={scale} plot={plot} index={index} isHovered={this.props.hoveredIndex === index} hoverAction={this.props.actions.hoverOverPlot} key={index} />);
    });

    const marginLeft = `calc(calc(100vw - ${this.props.gridInfo.width * scale}px) / 2)`;
    const gridStyle = {
      width: this.props.gridInfo.width * scale,
      height: this.props.gridInfo.height * scale,
      marginLeft: marginLeft,
      position: 'absolute'
    };

    const zoomControlStyle = {

    }

    let overlay = null;
    if (this.props.inBuyMode) {
      const overlayStyle = {
        width: this.props.gridInfo.width * scale,
        height: this.props.gridInfo.height * scale,
        marginLeft: marginLeft,
        position: 'absolute',
        cursor: 'crosshair'
      };

      let purchasePlotRect = null;
      if (this.props.dragRectCurr && this.props.dragRectStart) {
        purchasePlotRect = {
          x: Math.min(this.props.dragRectCurr.x, this.props.dragRectStart.x),
          y: Math.min(this.props.dragRectCurr.y, this.props.dragRectStart.y),
          w: Math.abs(this.props.dragRectCurr.x - this.props.dragRectStart.x),
          h: Math.abs(this.props.dragRectCurr.y - this.props.dragRectStart.y)
        };

        purchasePlotRect.x2 = purchasePlotRect.x + purchasePlotRect.w;
        purchasePlotRect.y2 = purchasePlotRect.y + purchasePlotRect.h;

        if (!this.props.isDraggingRect && purchasePlotRect.w === 0 && purchasePlotRect.h === 0) {
          purchasePlotRect = null;
        }
      }

      overlay = (
        <div className="gridOverlay" style={overlayStyle}
          onMouseDown={this.overlayMouseDown.bind(this)}
          onMouseMove={this.overlayMouseMove.bind(this)}
          onMouseUp={this.overlayMouseUp.bind(this)}>
          {
            purchasePlotRect ? <PurchasePlot
              startPurchase={this.props.actions.showPurchaseDialog}
              scale={scale}
              rect={purchasePlotRect} /> : null
          }
        </div>);
    }

    const sectionStyle = {
      position: 'relative'
    };

    return (
      <div className="gridSection" style={sectionStyle}>
        <div style={gridStyle} className="grid" onMouseOut={this.mouseOut.bind(this)}>
          {plots}
        </div>
        {overlay}
        <ZoomControl scale={scale} changeZoom={this.props.actions.changeZoom}/>
      </div>
    );
  }
}

Grid.propTypes = {
  plots: PropTypes.array.isRequired,
  actions: PropTypes.object.isRequired
};
