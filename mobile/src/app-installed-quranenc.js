import {installedQuranEncFetch} from './installed-quranenc.mjs';
import lock from '../installed-quranenc-lock.json';
import catalog from './offline-catalog.json';
window.fetch=installedQuranEncFetch({fetch:window.fetch.bind(window),origin:location.origin,lock,studyChapters:location.pathname==='/study.html'?catalog.chapters:undefined});
