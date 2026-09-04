// Parche proactivo para librerías como leaflet.heat que leen pixels repetidamente con getImageData
if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (contextType, contextAttributes) {
    if (contextType === '2d') {
      contextAttributes = { willReadFrequently: true, ...(contextAttributes || {}) };
    }
    return originalGetContext.call(this, contextType, contextAttributes);
  };
}

import { createApp } from 'vue';
import './styles/main.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');

