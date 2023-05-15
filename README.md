Traffic Count App
=============

This regional traffic count app is built to utilize Delaware Valley Regional Planning Commission (DVRPC) feature services.



## @TODO
- Report Rendering
    - H1 Format: #{DVRPC Number} - {Road Name} (SR #), {Municipality} {County} (remove fields from bottom)
    - H2: Count Type + Limits
    - ^ @NOTE: all of these are optional
    - Add AADT/AADB/AADP, Segment/Offset, PM Peak Hours to bottom
    - Move hi temp, low temp & Weather rows to bottom of table
        - For now: just move it to the bottom
    - Right align table cells
    - Zoom and Highlight point on map
    - Smooth transition from data table to report table
        - add loading indicator / feedback

- Webpack update
    - better way to include .js dependencies
        - dvrpc.draw.js and vendor.min.js are copied over, they could be included into map.js and made part of the bundle