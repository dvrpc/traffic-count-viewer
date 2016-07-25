'use strict';
//declare boundary of region
var oLat = 40.018,
    oLng = -75.148,
    zLevel = 10; ///adjust lat-lon coordinates to center on your region


///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
/////////      Declare Query Data        ///////////////////
//////////////////////////////////////////////////////////////////
var searchArea, queryValue, queryLayer, queryName, currTable, rec_query, table, centerLatLng, map, polygonDrawer,
    locationQuery = [],
    download_records = [],
    TCtable = [],
    legend_types = {},
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    queryType = 'location',
    // animating = false,
    tableExists = false,
    proximity_sort = false,
    syncMapTable = true,
    fitSearchArea = false;

/*  calculation of height for table [window height] minus height of elements \*
\*  header elements, panel padding, table header content,header row,footer data,table margin 
    123, 20, 35, 35, 20 + 37, 12  */
var win_height = $(window).height();
var table_rows = Math.floor((win_height - 282) / 35);

var count_dictionary = {
    'Volume' : {
        'class' :'ct-vol',
        'rank' : 1
    },
    '15 Min Volume' : {
        'class' :'ct-15min',
        'rank' : 2
    },
    'Speed' : {
        'class' :'ct-speed',
        'rank' : 3
    },
    'Class' : {
        'class' :'ct-class',
        'rank' : 4
    },
    'Manual Class' : {
        'class' :'ct-mclass',
        'rank' : 5
    },
    'Turning Movement' : {
        'class' :'ct-tm',
        'rank' : 6
    },
    'Loop' : {
        'class' :'ct-loop',
        'rank' : 7
    },
    '8 Day' : {
        'class' :'ct-8day',
        'rank' : 8
    },
    'Crosswalk' : {
        'class' :'ct-cwalk',
        'rank' : 9
    }
};


$.ajax({
    url: "data/search_locations.json",
    dataType: 'json',
    success: function(data){ 
        processData(data); }

});
        
function processData(results){   
        
        // console.log('Process');
        // var results = csvAsString.csvToArray({ head:true, trim:true });

        $.each(results, function(i, location) {
            locationQuery.push({
                name: location[1],
                value: location[0],
                source: location[2]
            });
        });
        var locationBH = new Bloodhound({
            name: 'locations',
            datumTokenizer: function(d) {
                return Bloodhound.tokenizers.whitespace(d.name);
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: locationQuery,
            limit: 5
        });
        locationBH.initialize();
        //typeahead options
        var ttoptions = {
                hint: true,
                highlight: true,
                minLength: 1,
                limit: 5
            },
            ttoptions_display = {
                name: 'source',
                displayKey: 'name',
                source: locationBH.ttAdapter()
            };
        //landing page query handler
        $('#userQuery').typeahead(ttoptions, ttoptions_display).on('typeahead:selected', function(obj, datum) {
            queryLayer = datum.source;
            queryName = datum.name;
            queryValue = datum.value;
            fadeLanding(queryType, queryLayer, queryValue);
        });
        //map interface query handler
        $('#mapQuery').typeahead(ttoptions, ttoptions_display).on('typeahead:selected', function(obj, datum) {
            queryLayer = datum.source;
            queryName = datum.name;
            queryValue = datum.value;
            if (map.hasLayer(searchArea)) {
                map.removeLayer(searchArea);
            } //clear current search area from map
            $('.collapse.in').collapse('hide');
            proximity_sort = false; //on query change disable proximity search  
            searchLocation(queryLayer, queryValue);
            $('#mapQuery').typeahead('val', '');
        });

 }
    

// $.get("data/search_locations.csv", function(csvAsString){
//     var results = csvAsString.csvToArray({ head:true, trim:true });

//     $.each(results, function(i, location) {
//         locationQuery.push({
//             name: location[1],
//             value: location[0],
//             source: location[2]
//         });
//     });
//     var locationBH = new Bloodhound({
//         name: 'locations',
//         datumTokenizer: function(d) {
//             return Bloodhound.tokenizers.whitespace(d.name);
//         },
//         queryTokenizer: Bloodhound.tokenizers.whitespace,
//         local: locationQuery,
//         limit: 5
//     });
//     locationBH.initialize();
//     //typeahead options
//     var ttoptions = {
//             hint: true,
//             highlight: true,
//             minLength: 1,
//             limit: 5
//         },
//         ttoptions_display = {
//             name: 'source',
//             displayKey: 'name',
//             source: locationBH.ttAdapter()
//         };
//     //landing page query handler
//     $('#userQuery').typeahead(ttoptions, ttoptions_display).on('typeahead:selected', function(obj, datum) {
//         queryLayer = datum.source;
//         queryName = datum.name;
//         queryValue = datum.value;
//         fadeLanding(queryType, queryLayer, queryValue);
//     });
//     //map interface query handler
//     $('#mapQuery').typeahead(ttoptions, ttoptions_display).on('typeahead:selected', function(obj, datum) {
//         queryLayer = datum.source;
//         queryName = datum.name;
//         queryValue = datum.value;
//         if (map.hasLayer(searchArea)) {
//             map.removeLayer(searchArea);
//         } //clear current search area from map
//         $('.collapse.in').collapse('hide');
//         proximity_sort = false; //on query change disable proximity search  
//         searchLocation(queryLayer, queryValue);
//         $('#mapQuery').typeahead('val', '');
//     });

//  });


//declare basemaps
// Basemap Layers
var CartoDB_Positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
});

var Mapbox_Imagery = L.tileLayer(
    'https://api.mapbox.com/styles/v1/crvanpollard/cimpi6q3l00geahm71yhzxjek/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY3J2YW5wb2xsYXJkIiwiYSI6Ii00ZklVS28ifQ.Ht4KwAM3ZUjo1dT2Erskgg', {
        tileSize: 512,
        zoomOffset: -1,
        attribution: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });


//create map instance
function createMap() {
    var county;
    map = new L.map('mapDIV', {
        minZoom: zLevel,
        zoomControl: false,
        layers: [CartoDB_Positron]
    }).setView([oLat, oLng], zLevel);

    var baseLayers = {
        'Satellite': Mapbox_Imagery,
        'Street Map': CartoDB_Positron
    };

    county = L.esri.featureLayer({
        url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Boundaries/DVRPC_Boundaries/FeatureServer/1',
        simplifyFactor: 0.5,
        precision: 5,
        style: {
            color: 'grey',
            weight: 3,
            fill: false,
            opacity: 0.3,
            clickable: false
        }
    }).addTo(map);

    var layerControl = L.control.layers(baseLayers, null, {
        position: 'topright'
    }).addTo(map);

    map.addControl(L.control.zoom({
        position: 'topright'
    }));

    // handle start of new custom search area
    map.on('click', function() {
        $('#aoi-help').collapse('hide');
    });
    map.on('draw:drawstart', function() {
        syncMapTable = false;
        $('#return-to-search').hide();
        $('#noresults').hide();
    });
    map.on('moveend', function() {
        if (syncMapTable) {
            filDataTable(map.getBounds());
        }
    });
    map.on('zoomend', function() {
        if (syncMapTable) {
            filDataTable(map.getBounds());
        }
    });

    // handle completion of custom search area draw event
    map.on('draw:created', function(e) {
        if (map.hasLayer(searchArea)) {
            map.removeLayer(searchArea);
        } //clear current search area from map
        if (map.hasLayer(TCresults)) {
            map.removeLayer(TCresults);
        }
        $('#aoi-draw').collapse('hide');
        searchArea = e.layer;
        proximity_sort = false; //if custom search area drawn disable proximity sort
        // add custom search area to map
        map.addLayer(searchArea);
        searchArea.setStyle({
            weight: 5,
            color: '#7d95b8',
            fill: false,
            opacity: 0.6
        });
        map.fitBounds(searchArea.getBounds());

        updateSearchArea(searchArea);
    });

    polygonDrawer = new L.Draw.Polygon(map);

    L.Control.MapLegend = L.Control.extend({
        options: {
            position: 'bottomleft',
        },
        onAdd: function (map) {
            //TODO: Probably should throw all this data in a class and just loop through it all
            var legendDiv = L.DomUtil.create('div', 'map-legend legend-control leaflet-bar');

            legendDiv.innerHTML += '<div id="legend-icon" title="Toggle Legend"><i class="glyphicon glyphicon-minus"></i><span class="legend-label" style="display:none;">&nbsp;&nbsp;Legend</span></div>';

            var legend_top = L.DomUtil.create('div', 'map-legend-items legend-top', legendDiv),
                legend_body = L.DomUtil.create('div', 'map-legend-items legend-body', legendDiv),
                legend_bottom = L.DomUtil.create('div', 'map-legend-items legend-bottom', legendDiv);

            legend_body.innerHTML += '<div id="legend-content" class="row"><div class="col-xs-4"><i class="glyphicon glyphicon-circle ct-vol"></i>&nbsp;&nbsp;Volume<br/><i class="glyphicon glyphicon-circle ct-15min"></i>&nbsp;&nbsp;15 Min Volume<br/><i class="glyphicon glyphicon-circle ct-speed"></i>&nbsp;&nbsp;Speed</div><div class="col-xs-4"><i class="glyphicon glyphicon-circle ct-class"></i>&nbsp;&nbsp;Class<br/><i class="glyphicon glyphicon-circle ct-mclass"></i>&nbsp;&nbsp;Manual Class<br/><i class="glyphicon glyphicon-circle ct-tm"></i>&nbsp;&nbsp;Turning Movement</div><div class="col-xs-4"><i class="glyphicon glyphicon-circle ct-loop"></i>&nbsp;&nbsp;Loop<br/><i class="glyphicon glyphicon-circle ct-8day"></i>&nbsp;&nbsp;8 Day<br/><i class="glyphicon glyphicon-circle ct-cwalk"></i>&nbsp;&nbsp;Crosswalk</div></div>';
            
            legend_top.innerHTML += '<p><b>Count Types</b><span id="legend-definition" class="nav-item" data-modal="legend-modal"><i class="glyphicon glyphicon-info-sign"></i>&nbsp;&nbsp;data definitions</span>';
            
            legendDiv.setAttribute('data-status', 'open');

            return legendDiv;
        }
    });
    var mapLegend = new L.Control.MapLegend();
    map.addControl(mapLegend);
}

// ****************************************
// define leaflet layers for selected records
var records_download = L.geoJson(null, {
    pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
            stroke: true,
            weight: 1,
            color: '#fff',
            radius: 5,
            fillOpacity: 0.8,
            fillColor: getValue(feature.properties.TYPE)
        });
    },
    onEachFeature: function(feature, layer) {
        if (feature.properties) {
            layer.bindLabel(processRoadname(feature.properties), {
                direction: 'auto',
                className: 'leaflet-label'
            });
            layer.on({
                mouseover: function(e) {
                    this.setStyle({
                        weight: 3,
                        radius: 10,
                        fillOpacity: 1.0
                    });
                },
                mouseout: function(e) {
                    this.setStyle({
                        weight: 1,
                        radius: 5,
                        fillOpacity: 0.8
                    });
                },
                click: function(e) {
                    if (TCtable.length > 0) {
                        proximity_sort = true;
                        centerLatLng = this.getLatLng(); //store as global
                        sortDataTable(); //sort table
                    }
                }
            });
        }
    },
});

var TCresults = L.geoJson(null, {
    pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
            stroke: true,
            weight: 1,
            color: '#fff',
            radius: 5,
            fillOpacity: 0.7,
            fillColor: getValue(feature.properties.TYPE)
        });
    },
    onEachFeature: function(feature, layer) {
        if (feature.properties) {
            layer.bindLabel(processRoadname(feature.properties), {
                direction: 'auto',
                className: 'leaflet-label'
            });
            layer.on({
                mouseover: function(e) {
                    this.setStyle({
                        weight: 3,
                        radius: 10,
                        fillOpacity: 1.0
                    });
                },
                mouseout: function(e) {
                    this.setStyle({
                        weight: 1,
                        radius: 5,
                        fillOpacity: 0.8
                    });
                },
                click: function(e) {
                    if (TCtable.length > 0) {
                        proximity_sort = true;
                        centerLatLng = this.getLatLng(); //store as global
                        sortDataTable(); //sort table
                    }
                }
            });
        }
    }
});

//  **********************************************
// prep table data for results table

var column_options = [{ //column prep for the collection of saved reports
    'className': 'select-record',
    'orderable': false,
    'data': null,
    'width': '1%',
    'searchable': false,
    'render': function(d) {
        //render checked box if record is in the currently selected records list
        if (findWithAttr(download_records, 'properties', 'RECORDNUM', d.recnum) > -1) {
            return '<i class="glyphicon glyphicon-check"></i>';
        } else {
            return '<i class="glyphicon glyphicon-unchecked"></i>';
        }

    }
}, {
    'data': 'date',
    'title': 'Date',
    'width': '10%',
    'className': 'table-date',
    'searchable': false
}, {
    'data': 'tableRoad',
    'title': 'Road',
    'width': '46%',
    'className': 'max-char'
}, {
    'data': 'type',
    'title': 'Type',
    'width': '20%',
    'className': 'table-type',
    'searchable': false
}, {
    'data': 'aadt',
    'title': 'AADT',
    'width': '6%',
    'type': 'num-fmt-nan',
    'searchable': false
}, {
    'data': 'report',
    'title': 'DVRPC File #',
    'width': '17%',
    'className': 'select-report',
}, {
    'data': 'unid',
    'visible': false,
    'searchable': false
}, {
    'data': 'recnum',
    'title': 'Record #',
    'visible': false,
    'searchable': false
}, {
    'data': 'latlng',
    'visible': false,
    'searchable': false
}, {
    'data': 'layer',
    'visible': false,
    'searchable': false
}];

jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    'num-fmt-nan-asc': function(a, b) {
        a = parseInt(a.replace(/,/g, ''));
        b = parseInt(b.replace(/,/g, ''));
        if (isNaN(a)) {
            a = 0;
        }
        if (isNaN(b)) {
            b = 0;
        }
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },
    'num-fmt-nan-desc': function(a, b) {
        a = parseInt(a.replace(/,/g, ''));
        b = parseInt(b.replace(/,/g, ''));
        if (isNaN(a)) {
            a = 0;
        }
        if (isNaN(b)) {
            b = 0;
        }
        return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
});

//build table
table = $('#table').DataTable({
    data: null,
    'columns': column_options,
    'order': [
        [1, 'desc']
    ],
    'pageLength': table_rows,
    'lengthChange': false,
    'dom': '<"results-toolbar">frtip',
    'language': {
        'search': 'Filter table results',
        'emptyTable': 'No results found'
    },
    'createdRow': function(row, data) {
        if (centerLatLng != null) {
            if (cartDist(data.latlng, centerLatLng) === 0) {
                $(row).addClass('coincident');
            }
        }
    }
});
tableExists = true;

$('#table thead th').removeClass('data-link');
$('div.results-toolbar').html('<button id="view-selected" type="button" class="download_all record-btns btn btn-primary btn-xs disabled">view selected</button><button type="button" class="download-records record-btns btn btn-primary btn-xs disabled" >download selected</button>');


//  ****************************************

function fadeLanding(type, layer, value) {
    $('#TC_header').css({
        'height': '60px'
    });
    $('.video-hero').css({
        'opacity': '0.0'
    }).delay(800).queue(function() {
        $('.video-hero').hide();
        $('#hero-video').get(0).pause();
    });
    $('#landingSearch').css({
        'opacity': '0.0'
    }).html();
    $('#container').addClass('mapView');

    $('#landing_map').toggleClass('col-sm-12 col-lg-12 col-sm-6 col-lg-6').delay(790).queue(function() {
        createMap();
        $('#mapDIV').queue(function() {
            switch (type) {
                case 'location':
                    searchLocation(layer, value);
                    break;
                case 'recnumber':
                    break;
                default:
                    polygonDrawer.enable();
                    $('#loading').hide();
                    break;
            }
            $('#mapDIV').css({
                'opacity': '1.0'
            }); //fade map instance into object   
            $('#container').fadeOut();
        });
    });
}


//  *********************************************
//  query functions
//  -----------------------------------------------
function searchLocation(layer, query) {
    L.esri.Tasks.query({
            url: get_query_url(layer)
        })
        .where(get_key_field(layer) + "='" + query + "'")
        .run(function(error, location) {
            if (!error) {
                syncMapTable = false;
                fitSearchArea = true; //reset fit search area to true

                searchArea = L.geoJson(location, {
                    style: {
                        weight: 5,
                        color: '#7d95b8',
                        fill: false,
                        opacity: 0.6
                    }
                });

                // fit map to boundry
                map.fitBounds(searchArea.getBounds());
                searchArea.addTo(map);
                updateSearchArea(searchArea);

                $('.filter-btn').prop('disabled', false); //ensures filter button is active
            } else {
                //throw error message
            }
        });
}

// query by record numbers
function search_by_number() {
    var criteria = '',
        records = '';

    $('#loading').show();

    records = rec_query.split(',');
    $(records).each(function(i, d) {
        (!criteria.length) ? criteria += ' ': criteria += ' OR ';
        criteria += "(RECORDNUM = '" + d + "')";
    });

    L.esri.Tasks.query({
            url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Transportation/TrafficCounts/MapServer/0'
        })
        .where(criteria)
        .run(function(error, results) {
            if (!error) {
                var geojsonMarkerOptions = {
                    stroke: false,
                    radius: 5,
                    fillOpacity: 0.3
                };
                if (TCresults != null) {
                    TCresults.clearLayers();
                }
                TCresults.addData(results); //push data to TCresults

                $('#loading').hide();

                map_direct(); //builds map and table
            } else {
                //throw an error message for the failed query
            }
        });
}

// default query
function updateSearchArea(zone, typ) {
    var criteria = '',
        TypeCriteria = '';

    //hide dialogs and collapse panels
    $('#loading').show();
    $('.collapse.in').collapse('hide');

    //process count type filter buttons and add checked to type query string
    $('#dropdown-types input[type="checkbox"]').each(function(d) {
        if ($(this).prop('checked')) {
            (!TypeCriteria.length) ? TypeCriteria += ' AND (': TypeCriteria += ' OR ';
            TypeCriteria += "TYPE ='" + $(this).attr('data-layer') + "'";
        }
    });
    //close the count type criteria 
    if (TypeCriteria.length > 1) {
        TypeCriteria += ')';
    }

    criteria = "(SETYEAR >=" + min + " AND SETYEAR <=" + max + ")" + TypeCriteria;

    if (typ === 'filter') {
        fitSearchArea = false;
    }

    L.esri.Tasks.query({
            url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Transportation/TrafficCounts/MapServer/0'
        })
        .within(zone)
        .where(criteria)
        .run(function(error, results) {
            if (!error) {
                if (TCresults != null) {
                    TCresults.clearLayers();
                }

                TCresults.addData(results); //push data to TCresults
                $('#loading').hide();

                map_results(); //builds map and table

                clear_table_filter();
            } else {
                //throw an error message for the failed query
            }
        });
}

//  ********************************************
//  Build and render functions
//  --------------------------------------------

function map_direct() {
    syncMapTable = false;

    //remove unecessary layers
    if (map.hasLayer(records_download)) {
        map.removeLayer(records_download);
    }
    if (map.hasLayer(searchArea)) {
        map.removeLayer(records_download);
    }

    // add to download_records for check handling
    TCresults.eachLayer(function(d) {
        download_records.push(d.feature);
    });

    map.addLayer(TCresults);
    map.fitBounds(TCresults.getBounds());

    build_table(TCresults);

    clear_table_filter();

    $('div.results-toolbar').html('<button type="button" class="download-records btn btn-primary btn-xs">download selected</button>&nbsp;&nbsp;<p>Showing direct search results. To enable filters identify search area.</p>');
    $('.filter-btn').prop('disabled', true);
}

function map_results() {
    var dis = 'disabled';
    syncMapTable = true;
    fitSearchArea = true;

    if (map.hasLayer(records_download)) {
        map.removeLayer(records_download);
    }

    map.addLayer(TCresults);
    map.addLayer(searchArea);
    if (fitSearchArea) {
        map.fitBounds(searchArea.getBounds());
    }

    build_table(TCresults);

    if (download_records.length) {
        dis = ' ';
    }

    $('div.results-toolbar').html('<button id="view-selected" type="button" class="download_all record-btns btn btn-primary btn-xs ' + dis + '">view selected</button><button type="button" class="download-records record-btns btn btn-primary btn-xs ' + dis + '">download selected</button><span id="download-help" class="nav-item small" data-modal="help-modal"><i class="glyphicon glyphicon-question-sign"></i>&nbsp;&nbsp;download help</span>');
    $('.filter-btn').prop('disabled', false);
}

function map_selected() {
    if (download_records.length) {
        var dwnld_json = '',
            map_records = '';

        //if leaflet layer already exists clear it
        if (records_download !== null) {
            records_download.clearLayers();
        }

        //build geoJSON compatible json element
        dwnld_json = '{"type": "FeatureCollection","features": ' + JSON.stringify(download_records) + '}';
        map_records = jQuery.parseJSON(dwnld_json);

        //disable sync map state and remove standard layers
        syncMapTable = false;
        map.removeLayer(TCresults);
        map.removeLayer(searchArea);

        //populate map with selected records and zoom to extent
        records_download.addData(map_records).addTo(map);
        map.fitBounds(records_download.getBounds(), [30, 30]);

        build_table(records_download);

        clear_table_filter();

        $('div.results-toolbar').html('<button type="button" class="view-all btn btn-primary btn-xs">view all</button><button type="button" class="download-records record-btns btn btn-primary btn-xs">download selected</button><span id="download-help" class="nav-item small" data-modal="help-modal"><i class="glyphicon glyphicon-question-sign"></i>&nbsp;&nbsp;download help</span>');
        $('.filter-btn').prop('disabled', true);
    } else {
        //nothing should occur as view selected button should be disabled
    }
}

function build_table(results) {
    $('#noresults').hide();

    TCtable = [];

    results.eachLayer(function(m) {
        var date = m.feature.properties.SETDATE,
            road = processRoadname(m.feature.properties),
            type = m.feature.properties.TYPE,
            aadt = m.feature.properties.AADT,
            cntdir = m.feature.properties.CNTDIR,
            layer = m.feature.id,
            recnum = m.feature.properties.RECORDNUM,
            report = '<button type="button" class="btn btn-primary btn-xs">' + m.feature.properties.RECORDNUM + '&nbsp;<i class="glyphicon glyphicon-new-window" title="download report"></i></button>',
            unique = L.stamp(m),
            dt = new Date(date),
            latlng = m._latlng,
            tableRoad = processRoadname(m.feature.properties) + ' ' + ((m.feature.properties.CNTDIR != 'both') ? ('<span class="cnt-direction" >- ' + capitalize(m.feature.properties.CNTDIR.split('')[0]) + 'B</span>') : ''),
            MmYear = '<span class="hidden">' + dt.getFullYear() + dt.getMonth() + dt.getDate() + '</span>' + months[dt.getMonth()] + ' ' + dt.getFullYear(),
            aadt_form = (aadt !== 0) ? numeral(aadt).format('0,0') : 'n/a';
        TCtable.push({
            'date': MmYear,
            'road': road,
            'type': capitalize(type),
            'aadt': aadt_form,
            'cntdir': cntdir,
            'unid': unique,
            'layer': layer,
            'recnum': recnum,
            'report': report,
            'latlng': latlng,
            'tableRoad': tableRoad
        });
    });

    if (TCtable.length) {
        if (syncMapTable) {
            filDataTable(map.getBounds());
        } else {
            render_table(TCtable);
        }
    } else {
        clearTable();
        // launch message expressing no results available
        $('#noresults').show();
    }
}

function render_table(values) {
    $('#return-to-search').hide();

    currTable = values;
    
    if (values.length) {
        if (proximity_sort) { //if proximity sort is active build sorted by distance
            sortDataTable();
        } else {
            clearTable();
            table.order([1, 'desc']);
            table.rows.add(values).draw();
            resizeTableHeight();
        }
        if (currTable.length != TCtable.length) {
            $('#table_info').append(' (' + TCtable.length + ' results in search area)');
        }
        build_legend(values);
    } else {
        clearTable();
        // launch message expressing no results available
        $('#return-to-search').show();
    }
}

function clearTable() {
    if (tableExists) {
        table.clear().draw();
    }
}

function build_legend(v){
    var legend_content ='<div class="col-xs-4">';
    var legend_sorted = [];
    legend_types = {};

    for (var i = 0, len = v.length; i < len; i++){
        if( !legend_types[v[i].type] ){
            legend_types[v[i].type] = count_dictionary[v[i].type].rank;
        }
    }

    legend_sorted = Object.keys(legend_types).sort(function(a,b){return legend_types[a]-legend_types[b];});
    var ls = legend_sorted.length;
    var items_per = Math.floor((ls > 5) ? ls / 3 : ls / 2);

    for (var i = 0, len = legend_sorted.length; i < len; i++){
        if (!(i % items_per) && i !== 0) {
            legend_content += '</div><div class="col-xs-4">';
        }
        legend_content += '<i class="glyphicon glyphicon-circle ' + count_dictionary[legend_sorted[i]].class + '"></i>&nbsp;&nbsp;' + legend_sorted[i] + '</br>';
        if (i + 1 === len){
            legend_content += '</div>';
        }
    }
    $('#legend-content').html(legend_content);
}

//  **********************************************
//  helper functions
//  ----------------------------------------------

function clear_table_filter() {
    table.search( '' )
        .columns().search( '' )
        .draw();
} 

function get_key_field(layer) {
    switch (layer) {
        case 'zip':
            return 'ZIP_CODE';
        case 'mun_boundary':
            return 'OBJECTID';
        case 'neighborhood':
            return 'FID';
    }
}

function get_query_url(layer) {
    switch (layer) {
        case 'zip':
            return 'http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_ZIP_Codes_2015/FeatureServer/0';
        case 'mun_boundary':
            return 'http://arcgis.dvrpc.org/arcgis/rest/services/AppData/TC_MCD/MapServer/2';
        case 'neighborhood':
            return 'http://services.arcgis.com/rkitYk91zieQFZov/ArcGIS/rest/services/Philadelphia_Neighborhoods/FeatureServer/0';
    }
}

function getValue(type) {

    switch (type) {
        case 'Volume':
            return '#ff7f00';
        case '15 min Volume':
            return '#35978f';
        case 'Speed':
            return '#c2e699';
        case 'Class':
            return '#fb9a99';
        case 'Manual Class':
            return '#e31a1c';
        case 'Turning Movement':
            return '#1f78b4';
        case 'Loop':
            return '#cab2d6';
        case '8 Day':
            return '#fdbf6f';
        case 'Crosswalk':
            return '#dd3497';
    }
}

function processRoadname(f) {
    if (f.RDPREFIX !== ' ') {
        var road_name = (f.ROAD !== ' ') ? ' (' + capitalize(f.ROAD) + ')' : '';
        return f.RDPREFIX.toUpperCase() + ' ' + f.ROUTE + road_name;
    } else {
        return capitalize(f.ROAD);
    }
}

function findWithAttr(array, attr, attr2, value) {
    for (var i = 0, j = array.length; i < j; i++) {
        if (array[i][attr][attr2] === parseInt(value)) {
            return i;
        }
    }
}

function capitalize(s) {
    return s.toLowerCase().replace(/\b./g, function(a) {
        return a.toUpperCase();
    }).replace(/(Wb |Eb |Nb |Sb )/g , function (g) {
        return g.toUpperCase();
    }).replace(/('[A-z])/g, function (l) {
        return l.toLowerCase();
    });
}

function sortDataTable(e) {
    currTable.sort(function(x, y) {
        var cDistX = cartDist(centerLatLng, x.latlng),
            cDistY = cartDist(centerLatLng, y.latlng);
        if (cDistX < cDistY) {
            return -1;
        }
        if (cDistX > cDistY) {
            return 1;
        }
        if (x.recnum < y.recnum) {
            return 1;
        }
        if (x.recnum > y.recnum) {
            return -1;
        }
        return 0;
    });
    if (tableExists) {
        clearTable();
        table.order([0, 'desc']);
        table.rows.add(currTable).draw();
        resizeTableHeight();
    }
}

function cartDist(oLatLng, dLatLng) {
    return Math.sqrt(Math.pow(dLatLng.lat - oLatLng.lat, 2) + Math.pow(dLatLng.lng - oLatLng.lng, 2));
}

function filDataTable(mapBounds) {
    if (TCtable.length) {
        render_table(
            TCtable.filter(function(x) {
                return mapBounds.contains(x.latlng);
            })
        );
    }
}


//*****************************************************
// click handling funciton for clicking on the record for a report (individual)

function record_report(dr, typ) {
    //build functionality for various report types
    if (typ === 'Turning Movement' || typ === 'Manual Class' || typ === 'Crosswalk') {
        window.open('http://www.dvrpc.org/asp/TrafficCountPDF/' + typ + '/' + dr + '.pdf', '_blank');
    } else {
        window.open('http://www.dvrpc.org/asp/trafficCount/default.aspx?recnum=' + dr, '_blank');
    }
}

//**********************************************************
// checkbox handling for saving a list of records for export later

$(document.body).on('click', '#table tbody td.select-record', function() {
    var tr = $(this).closest('tr');
    var row = table.row(tr).data();
    var check_status = $(this).find('i');

    if (check_status.hasClass('glyphicon-check')) {
        //item is already saved for download, remove it form the list
        check_status.toggleClass('glyphicon-check glyphicon-unchecked');

        //remove the item from the download list
        var id = row.recnum;
        for (var i = 0, len = download_records.length; i < len; i++) {
            if (parseInt(download_records[i].properties.RECORDNUM) == id) {
                download_records.splice(i, 1);
                break;
            }
        }
        if (!download_records.length) {
            $('.record-btns').toggleClass('disabled');
        }
    } else {
        //add item to the download list
        check_status.toggleClass('glyphicon-unchecked glyphicon-check');
        download_records.push(map._layers[row.unid].feature);
        if ($('#view-selected').hasClass('disabled')) {
            $('.record-btns').toggleClass('disabled');
        }
    }

});

$(document.body).on('click', '#table tbody td', function() {

    if (table.cell(this).index().column === 5) {
        var trow = table
            .cell(this)
            .index().row;
        var datarow = table.row(trow)
            .data();
        record_report(datarow.recnum, datarow.type);
    }
});
$(document.body).on('mouseover', '#table tbody td', function() {
    if (tableExists && TCtable.length) {
        var mo_row = table.cell(this).index().row;
        var mo_data = table.row(mo_row).data();
        map._layers[mo_data.unid].setStyle({
            weigth: 3,
            radius: 10,
            fillOpacity: 1.0
        });
    }
});
$(document.body).on('mouseleave', '#table tbody td', function() {
    if (tableExists && TCtable.length) {
        var mo_row = table.cell(this).index().row;
        var mo_data = table.row(mo_row).data();
        map._layers[mo_data.unid].setStyle({
            weight: 1,
            radius: 5,
            fillOpacity: 0.8
        });
    }
});
$(document).on('click', '.dropdown-menu', function(e) {
    if ($(this).hasClass('keep-open-on-click')) {
        e.stopPropagation();
    }
});

$('#dropdown-types').on('mouseleave', function(e) {
    $('#count_types_dropdown').dropdown('toggle');
});

$('#dropdown_years').on('mouseleave', function(e) {
    $('#count_years_dropdown').dropdown('toggle');
});

$(document).ready(function() {
    $('[data-tooltip="tooltip"]').tooltip({
        placement: 'left'
    });
});

//  ***********************************************
// button handling

$(document).on('click', '.download-records', function(e) {
    var _min = 1,
        _count_reuqest = '';
    
    var btn_template = '<a type="button" data-loading-text="Downloading..." class="download-request btn btn-primary btn-md" href="http://www.dvrpc.org/asp/trafficCount/download.aspx?recnum=';
    
    _count_reuqest += btn_template;
    
    for (var i = 0, len = download_records.length; i < len; i++) {
        var _record = download_records[i].properties.RECORDNUM;
        var _count = i + 1;

        if ((_count === len || !(_count % 50)) && (_count % 51)) {
            _count_reuqest += _record + '">Download Records (' + _min + ' - ' + _count + ')</a><br/>';
        } else if (!(len % 51) && _count === len) {
            _count_reuqest += btn_template + _record + '">Download Records (' + _count + ' - ' + _count + ')</a><br/>';
        } else if (!(_count % 51)) {
            _count_reuqest += btn_template + _record + ',';
            _min = _count;
        } else {
            _count_reuqest += _record + ',';
        }

        if (len > 50) {
            $('#download-notice').html('<p>Your request exceeds our batch limit of 50 records per download. We have grouped your count requests into separate downloads.</p>');
        }
    }

    $('#download-container').html(_count_reuqest);
    $('#download-modal').modal('show');
});

$(document.body).on('click', '.download-request', function() {
    
    $(this).button('loading').delay(3500).queue(function() {
        // @todo: create a better handling of the download request with cookies
        $(this).replaceWith('<div class="alert alert-success" role="alert">Download may take a few seconds to process.</div>');
    });         
});

$(document.body).on('click', '.nav-item', function() {
    var mod_open = $(this).attr('data-modal');
    $('#' + mod_open).modal('show'); 
    return false;
});

// legend toggle
$(document.body).on('click', '#legend-icon', function(){
    var toggleStatus = $('.map-legend').attr('data-status');

    if(toggleStatus === 'closed'){
        $('.map-legend').css('width', '450px').css('height', 'auto').attr('data-status', 'open');
        $('#legend-icon i').toggleClass('glyphicon glyphicon-list glyphicon glyphicon-minus');
        $('#legend-icon .legend-label').hide();
        $('.map-legend-items').show();
    }else{
        $('.map-legend').css('width', '80px').css('height', '32px').attr('data-status', 'closed');
        $('#legend-icon i').toggleClass('glyphicon glyphicon-minus glyphicon glyphicon-list');
        $('#legend-icon .legend-label').show();
        $('.map-legend-items').hide();
    }
});

$('#updateSearchbtn').on('click', function() {
    updateSearchArea(searchArea, 'filter');
    $('.collapse.in').collapse('hide');
});

$('#aoiSearch').on('click', function() {
    queryType = 'aoi';
    fadeLanding(queryType, queryLayer, queryValue);
    $('#aoi-draw').collapse('show');
    $('#aoi-help').collapse('show');
});

$('#count_num').on('click', function() {
    fadeLanding('recnumber');
});

$('#filterBtn').on('click', function() {
    $('.collapse.in').collapse('hide');
});

$('#count_types checkbox').on('click', function() {
    ($(this).attr('checked') === 'checked') ? $(this).attr('data-render', 'false'): $(this).attr('data-render', 'true');
    $(this).toggleClass('inactive');
});

$('#searchBtn').on('click', function() {
    $('.collapse.in').collapse('hide');
});

$('#doaSearch').on('click', function() {
    polygonDrawer.enable();
    $('.collapse.in').collapse('hide');
    $('#aoi-draw').collapse('show');
    $('#aoi-help').collapse('show');
});
$('#draw-cancel').on('click', function() {
    polygonDrawer.disable();
    $('#aoi-draw').collapse('hide');
});
$('#delete-last').on('click', function() {
    polygonDrawer.deleteLastVertex();
});
$('#aoi-help').on('click', function() {
    $('#aoi-help').collapse('hide');
});

$('#filter').on('hide.bs.collapse', function(e) {
    $('#preFilter').text('Show');
});
$('#filter').on('show.bs.collapse', function(e) {
    $('#preFilter').text('Hide');
});
$('#fit-search').on('click', function(e) {
    map.fitBounds(searchArea);
});

$('a[href^="#"]').on('click', function(event) {

    var target = $(this.getAttribute('href'));

    if( target.length ) {
        event.preventDefault();
        $('html, body').stop().animate({
            scrollTop: target.offset().bottom
        }, 1000);
    }

});

$(document.body).on('click', '.view-all', function(e) {
    map_results();
});

$(document.body).on('click', '.download_all', function() {
    map_selected();
});

// handle search by record number form
$('#rec-num-submit').on('click', function(e) {
    var form = $('#recnum-form');
    var recs = $(form).find('#records').val();
    if(recs === 'tasty time' || recs === 'gusgus'){
        partyTime(recs);

    } else {
        rec_query = recs.replace(/^(?:[\s+]|"[|-]")+/, '')
            .replace(/(?:[\s+]|"[|-]")+$/, '');

        search_by_number();     
    }

    $('#count-modal').modal('hide');    
});

$(document.body).on('click', '#js-sc-close', function(){
    $('#party').remove();
});

function partyTime(dude) {
    var tasty = document.createElement('div');
    tasty.id = 'party';
    tasty.style = 'width:500px;height:60px;position:absolute;top:130px;left:20px;background-color:#efefef;';
    var shut_it = document.createElement('div');
    shut_it.id = 'js-sc-close';
    shut_it.style = 'height:20px;width:20px;font-size:14px;color:#fff;text-align:center;background-color:#ff9900;position:absolute;top:0;right:-20px;';
    shut_it.innerHTML = 'x';
    tasty.appendChild(shut_it);
    var iframe = document.createElement('iframe');
    iframe.width = '500';
    iframe.height = '60';
    iframe.scrolling = 'no';
    iframe.frameborder = 'no';
    if (dude === 'tasty time') {
        iframe.src = 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/269256410&amp;color=ff9900&amp;auto_play=true&amp;hide_related=false&amp;show_comments=false&amp;show_user=false&amp;show_reposts=false;'; 
    } else if (dude === 'gusgus') {
        iframe.src = 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/269339832&amp;color=ff5500&amp;auto_play=true&amp;hide_related=false&amp;show_comments=false&amp;show_user=false&amp;show_reposts=false'; 
    }
    
    tasty.appendChild(iframe);
    document.body.appendChild(tasty);

    $('#records').val('');
}


function getDynTableHeight() {
    return ($('#results-panel').height() -
        //getRealHigh('.dataTables_scrollHead') -
        getRealHigh('#table_filter') -
        getRealHigh('#table_paginate') -
        getRealHigh('#table_info'));
}

function getRealHigh(domID) { // hehe
    // Only works for pixels. PIXEL PERFECT
    return ($(domID).height() +
        parseInt($(domID).css('margin-top').replace('px', '')) +
        parseInt($(domID).css('margin-bottom').replace('px', '')) +
        parseInt($(domID).css('padding-top').replace('px', '')) +
        parseInt($(domID).css('padding-bottom').replace('px', '')));
}

function resizeTableHeight() {
    //$(".dataTables_scrollBody").css({"max-height": getDynTableHeight() + "px"});
}

$(window).resize(function() {
    if (tableExists && TCtable.length) {
        table.page.len(Math.max(1, (Math.floor(getDynTableHeight() - 20) / 34) - 1)).draw();
    }
});

///////////////////////////////////////////////
//date selection slider powered by noUiSlider
////////////////////////////////////////////////

var slider_min = 1995,
    max = new Date().getFullYear(),
    min = max - 5,
    density = max - slider_min,
    yearSlider = document.getElementById('yearSlider');

function filterdates(value) {
    return value % 5 ? 0 : 1;
}
noUiSlider.create(yearSlider, {
    start: [min, max],
    connect: true,
    step: 1,
    behaviour: 'tap-snap',
    range: {
        'min': slider_min,
        'max': max
    },
    pips: {
        mode: 'steps',
        filter: filterdates,
        density: density
    }
});

yearSlider.noUiSlider.on('update', function(values) {
    $('#yearMin').text(Math.round(values[0]));
    $('#yearMax').text(Math.round(values[1]));
    min = Math.round(values[0]);
    max = Math.round(values[1]);
});

//draw toolbar modifications
L.drawLocal.draw.toolbar.buttons.polygon = 'Draw a custom search area';


(function() {


    if (window.jQuery) {

        // jQuery version
        $(document).ready(function() {

            // Add a 'js' class to the html tag
            // If you're using modernizr or similar, you
            // won't need to do this
            $('html').addClass('js');

            // Fade in videos
            var $fade_in_videos = $('.video-bg video');
            $fade_in_videos.each(function() {
                if ($(this)[0].currentTime > 0) {
                    // It's already started playing
                    $(this).addClass('is-playing');
                } else {
                    // It hasn't started yet, wait for the playing event
                    $(this).on('playing', function() {
                        $(this).addClass('is-playing');
                    });
                }
            });

            // Scrap videos on iOS because it won't autoplay,
            // it adds it's own play icon and opens the
            // media player when clicked
            var iOS = /iPad|iPhone|iPod/.test(navigator.platform) || /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (iOS) {
                $('.video-bg video').remove();
            }

        });

    }

})();
