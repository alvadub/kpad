const Controller = require('../dist/handler.cjs');

const ctrl = new Controller({
  keypress: require('keypress'),
  easymidi: require('easymidi'),
});

ctrl.render();
