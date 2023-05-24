Traffic Count App
=============

This regional traffic count app is built to utilize Delaware Valley Regional Planning Commission (DVRPC) feature services.



## @TODO
- Report Rendering
    - Right align table cells
    - Zoom and Highlight point on map
    - Smooth transition from data table to report table
        - add loading indicator / feedback

- Webpack update
    - better way to include .js dependencies
        - dvrpc.draw.js and vendor.min.js are copied over, they could be included into map.js and made part of the bundle