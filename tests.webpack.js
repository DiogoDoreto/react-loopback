// include polyfills that won't go into the library
import {polyfill} from 'es6-promise';
polyfill();

var testsContext = require.context('./src', true, /-test\.jsx?$/);
testsContext.keys().forEach(testsContext);
