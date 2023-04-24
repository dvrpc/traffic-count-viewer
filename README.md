Traffic Count App
=============

This regional traffic count app is built to utilize Delaware Valley Regional Planning Commission (DVRPC) feature services.



## @TODO
- Crystal Reports
    - Smooth transition from data table to report table
        - some kind of loading indicator. The API call can take a second or two, users need to know work is happening in the meantime. 

- Webpack update
    - better way to include .js dependencies
        - dvrpc.draw.js and vendor.min.js are copied over, they could be included into map.js and made part of the bundle