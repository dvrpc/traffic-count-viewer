Traffic Count App
=============

This regional traffic count app is built to utilize Delaware Valley Regional Planning Commission (DVRPC) feature services.



## @TODO
- Report Rendering
    - H1 Format: #{DVRPC Number} - {Road Name} (SR #), {Municipality} {County} (remove fields from bottom)
        - no record type? i.e. vehicle, bicycle?
    - H2: Limits
    - Add AADT/AADB/AADP, Segment/Offset, PM Peak Hours to bottom
    - Move Temp/Weather rows to bottom of table
    - Right align table cells
    - Zoom and Highlight point on map
    - Smooth transition from data table to report table
        - add loading indicator / feedback

- Webpack update
    - better way to include .js dependencies
        - dvrpc.draw.js and vendor.min.js are copied over, they could be included into map.js and made part of the bundle