import React, { Component } from 'react';
import { Button, Collapse, Well } from 'react-bootstrap';

import FAQ from './FAQ';

export default class About extends Component {
  render() {
    return (
      <div class="aboutSection">
        <FAQ question={ "What is Eth Grid?"} answer = { "Coolest thing since sliced bread."} />
        <FAQ question={ "Why would I use this?"} answer = { "To be part of hethstory."} />
        <FAQ question={ "Are there fees?"} answer = { "Minor, to keep the lights on.  You can interact directly with our contracts though."} />
      </div>
    );
  }
}