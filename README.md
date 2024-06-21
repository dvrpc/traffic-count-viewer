# Traffic Count App

This regional traffic count app is built to utilize Delaware Valley Regional Planning Commission (DVRPC) feature services to access DVRPC regional transportation counts for the Delaware Valley.


## Development
The Traffic Count app is built on top of ESRI Leaflet for map services and Bootstrap for styling. Code dependencies and static assets are hosted locally. The app is served and bundled through Webpack.

Custom application code is all in [`/js/map.js`](https://github.com/dvrpc/traffic-count-viewer/blob/main/lib/js/map.js). Location autocomplete pulls from a local object found at [`/data/search_locations.js`](https://github.com/dvrpc/traffic-count-viewer/blob/main/data/search_locations.js).

## Getting Started
Requires `node` and `npm`
- `git clone` into directory
- `npm install`
- `npm start`

## Build Process
- `npm run build`
- copy bundle into staging folder
