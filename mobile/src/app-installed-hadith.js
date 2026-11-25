import { installedHadithFetch } from './installed-hadith.mjs';
import lock from '../installed-hadith-lock.json';

window.fetch = installedHadithFetch({ fetch: window.fetch.bind(window), origin: location.origin, lock });
