'use strict';

import searchLocations from '../../data/search_locations.js'
//declare boundary of region
var oLat = 40.018,
    oLng = -75.148,
    zLevel = 10; ///adjust lat-lon coordinates to center on your region


///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
/////////      Declare Query Data        ///////////////////
//////////////////////////////////////////////////////////////////
var searchArea, queryValue, queryLayer, activeCircleId, queryName, currTable, table, centerLatLng, map, polygonDrawer,
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
\*  header elements, panel padding, table header content,header row,btn padding,footer data,table margin 
    123, 20, 35, 35, 6, 20 + 37, 12  */
var win_height = $(window).height();
var table_rows = Math.floor((win_height - 282) / 38.5);

var count_dictionary = {
    'Volume' : {
        'class' :'ct-vol',
        'rank': 1,
        'color': '#ff7f00'
    },
    '15 Min Volume' : {
        'class' :'ct-15min',
        'rank': 2,
        'color': '#35978f'
    },
    'Speed' : {
        'class' :'ct-speed',
        'rank': 3,
        'color': '#42ce73'
    },
    'Class' : {
        'class' :'ct-class',
        'rank': 4,
        'color': '#952eff'
    },
    'Manual Class' : {
        'class' :'ct-mclass',
        'rank': 5,
        'color': '#cab2d6'
    },
    'Turning Movement' : {
        'class' :'ct-tm',
        'rank': 6,
        'color': '#eb2b2b'
    },
    'Loop' : {
        'class' :'ct-loop',
        'rank': 7,
        'color': '#00ffff'
    },
    '8 Day' : {
        'class' :'ct-8day',
        'rank': 8,
        'color': '#ffd06d'
    },
    'Crosswalk' : {
        'class' :'ct-cwalk',
        'rank': 9,
        'color': '#74add1'
    },
    'Bicycle' : {
        'class' :'ct-bike',
        'rank': 10,
        'color': '#2e5c95'
    },
     'Pedestrian' : {
        'class' :'ct-ped',
        'rank': 11,
        'color': '#d4007e'
    }
};

var query_sources = {
    'zip': {
        key: 'ZIP_CODE',
        url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_ZIP_Codes_2015/FeatureServer/0'
    },
    'mun_boundary': {
        key: 'OBJECTID',
        url: 'https://arcgis.dvrpc.org/portal/rest/services/Boundaries/MunicipalBoundaries/FeatureServer/0'
    },
    'neighborhood': {
        key: 'FID',
        url: 'https://services.arcgis.com/rkitYk91zieQFZov/ArcGIS/rest/services/Philadelphia_Neighborhoods/FeatureServer/0'
    }
};
        
function processData(){
        var locationBH = new Bloodhound({
            name: 'locations',
            datumTokenizer: function(d) {
                return Bloodhound.tokenizers.whitespace(d.name);
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: searchLocations,
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

processData()

//declare basemaps
// Basemap Layers
var CartoDB_Positron = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
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
        url: 'https://arcgis.dvrpc.org/portal/rest/services/Boundaries/CountyBoundaries/FeatureServer/0',
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
        // destroy sidebar_report on draw end
        remove_sidebar_report()

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

            legend_body.innerHTML += '<div id="legend-content" class="row"><div class="col-xs-4"><i class="glyphicon glyphicon-circle ct-vol"></i>&nbsp;&nbsp;Volume<br/><i class="glyphicon glyphicon-circle ct-15min"></i>&nbsp;&nbsp;15 Min Volume<br/><i class="glyphicon glyphicon-circle ct-speed"></i>&nbsp;&nbsp;Speed</div><div class="col-xs-4"><i class="glyphicon glyphicon-circle ct-class"></i>&nbsp;&nbsp;Class<br/><i class="glyphicon glyphicon-circle ct-mclass"></i>&nbsp;&nbsp;Manual Class<br/><i class="glyphicon glyphicon-circle ct-tm"></i>&nbsp;&nbsp;Turning Movement</div><div class="col-xs-4"><i class="glyphicon glyphicon-circle ct-loop"></i>&nbsp;&nbsp;Loop<br/><i class="glyphicon glyphicon-circle ct-8day"></i>&nbsp;&nbsp;8 Day<br/><i class="glyphicon glyphicon-circle ct-bike"></i>&nbsp;&nbsp;Bicycle<br/><i class="glyphicon glyphicon-circle ct-ped"></i>&nbsp;&nbsp;Pedestrian<br/><i class="glyphicon glyphicon-circle ct-cwalk"></i>&nbsp;&nbsp;Crosswalk</div></div>';
   
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
            fillColor: count_dictionary[titleCase(feature.properties.type)].color
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
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
            stroke: true,
            weight: 1,
            color: '#fff',
            radius: 5,
            fillOpacity: 0.7,
            fillColor: count_dictionary[titleCase(feature.properties.type)].color
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
// Create records table headers
var column_options = [
    {
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
        'title': 'Volume',
        'width': '6%',
        'type': 'num-fmt-nan',
        'searchable': false
    }, {
        'data': 'report',
        'title': 'Report',
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
    }
];

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
        'search': 'Filter table results by road name',
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
// @BUG: "token required" error thrown for philadelphia neighborhoods
function searchLocation(layer, query) {
    L.esri.Tasks.query({
            url: query_sources[layer].url
        })
        .where(query_sources[layer].key + "=" + query + "")
        .run(function(error, location) {
            if (!error) {

                console.log('location ', location)

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
                remove_sidebar_report()

                $('.filter-btn').prop('disabled', false); //ensures filter button is active
            } else {
                //throw error message
                console.log('error ', error)
            }
        });
}

// query by record numbers
function search_by_number(rec_query) {
    $('#loading').show();

    var records = rec_query.split(',').map(function (rec) {
        return rec.trim();
    });
    
    var criteria = records.toString()

    L.esri.Tasks.query({
            url: 'https://arcgis.dvrpc.org/portal/rest/services/Transportation/tc_app/FeatureServer/0'
        })
        .where('(recordnum IN (' + criteria + '))')
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
            TypeCriteria += "type ='" + $(this).attr('data-layer') + "'";
        }
    });
    //close the count type criteria 
    if (TypeCriteria.length > 1) {
        TypeCriteria += ')';
    }

    criteria = "(setyear >=" + min + " AND setyear <=" + max + ")" + TypeCriteria;

    if (typ === 'filter') {
        fitSearchArea = false;
    }

    L.esri.Tasks.query({
            url: 'https://arcgis.dvrpc.org/portal/rest/services/Transportation/tc_app/FeatureServer/0'
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

        $('.filter-btn').prop('disabled', true);
    } else {
        //nothing should occur as view selected button should be disabled
    }
}

function build_table(results) {
    $('#noresults').hide();

    TCtable = [];

    results.eachLayer(function(m) {
        var date = m.feature.properties.setdate,
            road = processRoadname(m.feature.properties),
            type = m.feature.properties.type,
            aadt = m.feature.properties.volume,
            cntdir = m.feature.properties.cntdir || '',
            recnum = m.feature.properties.recordnum,
            report = '<button type="button" class="btn btn-primary btn-report">' + m.feature.properties.recordnum + '&nbsp;<i class="glyphicon glyphicon-open" title="view report"></i></button>',
            unique = L.stamp(m),
            dt = new Date(date),
            latlng = m._latlng,
            tableRoad = processRoadname(m.feature.properties) + ' ' + ((cntdir.length && cntdir != 'both') ? ('<span class="cnt-direction" >- ' + cntdir[0].toUpperCase() + 'B</span>') : ''),
            MmYear = '<span class="hidden">' + dt.getFullYear() + dt.getMonth() + dt.getDate() + '</span>' + months[dt.getMonth()] + ' ' + dt.getFullYear(),
            aadt_form = (aadt !== 0) ? numeral(aadt).format('0,0') : 'n/a';
        
        TCtable.push({
            'date': MmYear,
            'road': road,
            'type': capitalize(type),
            'aadt': aadt_form,
            'cntdir': cntdir,
            'unid': unique,
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

function titleCase(str) {
  return str.toLowerCase().split(' ').map(function(word) {
    return word.replace(word[0], word[0].toUpperCase());
  }).join(' ');
}

function processRoadname(f) {
    if (f.rdprefix !== null) {
        var road_name = (f.road !== null ) ? ' (' + capitalize(f.road) + ')' : '';
        return f.rdprefix.toUpperCase() + ' ' + f.route + road_name;
    } else {
        return capitalize(f.road);
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

// https://cloud.dvrpc.org/api/traffic-counts/v1/record/{num}
async function fetch_report_data(recordNum) {
    $('#loading-report').show()
    const stream = await fetch(`https://cloud.dvrpc.org/api/traffic-counts/v1/record/${recordNum}`)

    if(stream.ok) {
        const data = await stream.json()
        // handle nontabular data
        if(data.static_pdf) {
            // @TODO: long term it'll be good to visually separate records
                // that generate sidebar_report and those that open a static PDF
                // But how to pre-identify?
            window.open(data.static_pdf)
        }else {
            const report = create_sidebar_report(data)
            add_sidebar_report(report)
            $('#loading-report').hide()

            return true
        }
    } else {
        alert(`
            Sorry! Count ID ${recordNum} could not be fetched due to a "${stream.status} ${stream.statusText}" error. Please try again or contact jrocks@dvrpc.org
        `)
    }

    $('#loading-report').hide()
    
    return false
}

function fetch_csv(id) {
    window.open(`https://cloud.dvrpc.org/api/traffic-counts/v1/record/csv/${id}`)
}

// generate report table content
// brute force way: create <tr> variables for each row and append a <td> at each iteration
function make_report_table_content(counts) {
    // table sections
    const frag = document.createDocumentFragment()
    const thead = document.createElement('thead')
    const tbody = document.createElement('tbody')
    const theadtr = document.createElement('tr')

    // rows
    const midnightTr = document.createElement('tr')
    const oneamTr = document.createElement('tr')
    const twoamTr = document.createElement('tr')
    const threeamTr = document.createElement('tr')
    const fouramTr = document.createElement('tr')
    const fiveamTr = document.createElement('tr')
    const sixamTr = document.createElement('tr')
    const sevenamTr = document.createElement('tr')
    const eightamTr = document.createElement('tr')
    const nineamTr = document.createElement('tr')
    const tenamTr = document.createElement('tr')
    const elevenamTr = document.createElement('tr')
    const noonTr = document.createElement('tr')
    const onepmTr = document.createElement('tr')
    const twopmTr = document.createElement('tr')
    const threepmTr = document.createElement('tr')
    const fourpmTr = document.createElement('tr')
    const fivepmTr = document.createElement('tr')
    const sixpmTr = document.createElement('tr')
    const sevenpmTr = document.createElement('tr')
    const eightpmTr = document.createElement('tr')
    const ninepmTr = document.createElement('tr')
    const tenpmTr = document.createElement('tr')
    const elevenpmTr = document.createElement('tr')
    const totalTr = document.createElement('tr')

    const highTr = document.createElement('tr')
    const lowTr = document.createElement('tr')
    const weatherTr = document.createElement('tr')

    // row headers
    const blank = document.createElement('th')
    const midnightText = document.createElement('td')
    const oneamText = document.createElement('td')
    const twoamText = document.createElement('td')
    const threeamText = document.createElement('td')
    const fouramText = document.createElement('td')
    const fiveamText = document.createElement('td')
    const sixamText = document.createElement('td')
    const sevenamText = document.createElement('td')
    const eightamText = document.createElement('td')
    const nineamText = document.createElement('td')
    const tenamText = document.createElement('td')
    const elevenamText = document.createElement('td')
    const noonText = document.createElement('td')
    const onepmText = document.createElement('td')
    const twopmText = document.createElement('td')
    const threepmText = document.createElement('td')
    const fourpmText = document.createElement('td')
    const fivepmText = document.createElement('td')
    const sixpmText = document.createElement('td')
    const sevenpmText = document.createElement('td')
    const eightpmText = document.createElement('td')
    const ninepmText = document.createElement('td')
    const tenpmText = document.createElement('td')
    const elevenpmText = document.createElement('td')
    const totalText = document.createElement('td')

    const highText = document.createElement('td')
    const lowText = document.createElement('td')
    const weatherText = document.createElement('td')

    // classes and attributes
    thead.classList.add('report-thead')
    tbody.classList.add('report-tbody')
    totalTr.classList.add('report-totals')

    theadtr.role = 'row'

    // row header text
    midnightText.textContent = '12 AM'
    oneamText.textContent = '1 AM'
    twoamText.textContent = '2 AM'
    threeamText.textContent = '3 AM'
    fouramText.textContent = '4 AM'
    fiveamText.textContent = '5 AM'
    sixamText.textContent = '6 AM'
    sevenamText.textContent = '7 AM'
    eightamText.textContent = '8 AM'
    nineamText.textContent = '9 AM'
    tenamText.textContent = '10 AM'
    elevenamText.textContent = '11 AM'
    noonText.textContent = '12 PM'
    onepmText.textContent = '1 PM'
    twopmText.textContent = '2 PM'
    threepmText.textContent = '3 PM'
    fourpmText.textContent = '4 PM'
    fivepmText.textContent = '5 PM'
    sixpmText.textContent = '6 PM'
    sevenpmText.textContent = '7 PM'
    eightpmText.textContent = '8 PM'
    ninepmText.textContent = '9 PM'
    tenpmText.textContent = '10 PM'
    elevenpmText.textContent = '11 PM'
    totalText.textContent = 'Totals'

    highText.textContent = 'High Temp'
    lowText.textContent = 'Low Temp'
    weatherText.textContent = 'Weather'
    
    // attach row headers
    theadtr.appendChild(blank)
    midnightTr.appendChild(midnightText)
    oneamTr.appendChild(oneamText)
    twoamTr.appendChild(twoamText)
    threeamTr.appendChild(threeamText)
    fouramTr.appendChild(fouramText)
    fiveamTr.appendChild(fiveamText)
    sixamTr.appendChild(sixamText)
    sevenamTr.appendChild(sevenamText)
    eightamTr.appendChild(eightamText)
    nineamTr.appendChild(nineamText)
    tenamTr.appendChild(tenamText)
    elevenamTr.appendChild(elevenamText)
    noonTr.appendChild(noonText)
    onepmTr.appendChild(onepmText)
    twopmTr.appendChild(twopmText)
    threepmTr.appendChild(threepmText)
    fourpmTr.appendChild(fourpmText)
    fivepmTr.appendChild(fivepmText)
    sixpmTr.appendChild(sixpmText)
    sevenpmTr.appendChild(sevenpmText)
    eightpmTr.appendChild(eightpmText)
    ninepmTr.appendChild(ninepmText)
    tenpmTr.appendChild(tenpmText)
    elevenpmTr.appendChild(elevenpmText)
    totalTr.appendChild(totalText)
    highTr.appendChild(highText)
    lowTr.appendChild(lowText)
    weatherTr.appendChild(weatherText)

    // add fetched data
    counts.forEach(count => {
        // create header cells
        const day = count.date.replace(/-/g, '\/').replace(/T.+/, '') // hack to get the right day of the week
        const dayString = new Date(day).toLocaleDateString('en-US', { weekday: 'long' })
        const theadth = document.createElement('th')
        theadth.innerHTML = `${dayString} <br> ${day}`

        // create body cells
        const midnightTd = document.createElement('td')
        const oneamTd = document.createElement('td')
        const twoamTd = document.createElement('td')
        const threeamTd = document.createElement('td')
        const fouramTd = document.createElement('td')
        const fiveamTd = document.createElement('td')
        const sixamTd = document.createElement('td')
        const sevenamTd = document.createElement('td')
        const eightamTd = document.createElement('td')
        const nineamTd = document.createElement('td')
        const tenamTd = document.createElement('td')
        const elevenamTd = document.createElement('td')
        const noonTd = document.createElement('td')
        const onepmTd = document.createElement('td')
        const twopmTd = document.createElement('td')
        const threepmTd = document.createElement('td')
        const fourpmTd = document.createElement('td')
        const fivepmTd = document.createElement('td')
        const sixpmTd = document.createElement('td')
        const sevenpmTd = document.createElement('td')
        const eightpmTd = document.createElement('td')
        const ninepmTd = document.createElement('td')
        const tenpmTd = document.createElement('td')
        const elevenpmTd = document.createElement('td')
        const totalTd = document.createElement('td')

        const highTd = document.createElement('td')
        const lowTd = document.createElement('td')
        const weatherTd = document.createElement('td')

        midnightTd.textContent = count.AM12 || 0
        oneamTd.textContent = count.AM1 || 0
        twoamTd.textContent = count.AM2 || 0
        threeamTd.textContent = count.AM3 || 0
        fouramTd.textContent = count.AM4 || 0
        fiveamTd.textContent = count.AM5 || 0
        sixamTd.textContent = count.AM6 || 0
        sevenamTd.textContent = count.AM7 || 0
        eightamTd.textContent = count.AM8 || 0
        nineamTd.textContent = count.AM9 || 0
        tenamTd.textContent = count.AM10 || 0
        elevenamTd.textContent = count.AM11 || 0
        noonTd.textContent = count.PM12 || 0
        onepmTd.textContent = count.PM1 || 0
        twopmTd.textContent = count.PM2 || 0
        threepmTd.textContent = count.PM3 || 0
        fourpmTd.textContent = count.PM4 || 0
        fivepmTd.textContent = count.PM5 || 0
        sixpmTd.textContent = count.PM6 || 0
        sevenpmTd.textContent = count.PM7 || 0
        eightpmTd.textContent = count.PM8 || 0
        ninepmTd.textContent = count.PM9 || 0
        tenpmTd.textContent = count.PM10 || 0
        elevenpmTd.textContent = count.PM11 || 0
        totalTd.textContent = count.total ? count.total.toLocaleString() : 'n/a'

        highTd.textContent = count.high_temp || 0
        lowTd.textContent = count.low_temp || 0
        weatherTd.textContent = count.weather || 0
        
        // attach data to rows
        theadtr.appendChild(theadth)

        midnightTr.appendChild(midnightTd)
        oneamTr.appendChild(oneamTd)
        twoamTr.appendChild(twoamTd)
        threeamTr.appendChild(threeamTd)
        fouramTr.appendChild(fouramTd)
        fiveamTr.appendChild(fiveamTd)
        sixamTr.appendChild(sixamTd)
        sevenamTr.appendChild(sevenamTd)
        eightamTr.appendChild(eightamTd)
        nineamTr.appendChild(nineamTd)
        tenamTr.appendChild(tenamTd)
        elevenamTr.appendChild(elevenamTd)
        noonTr.appendChild(noonTd)
        onepmTr.appendChild(onepmTd)
        twopmTr.appendChild(twopmTd)
        threepmTr.appendChild(threepmTd)
        fourpmTr.appendChild(fourpmTd)
        fivepmTr.appendChild(fivepmTd)
        sixpmTr.appendChild(sixpmTd)
        sevenpmTr.appendChild(sevenpmTd)
        eightpmTr.appendChild(eightpmTd)
        ninepmTr.appendChild(ninepmTd)
        tenpmTr.appendChild(tenpmTd)
        elevenpmTr.appendChild(elevenpmTd)
        totalTr.appendChild(totalTd)

        highTr.appendChild(highTd)
        lowTr.appendChild(lowTd)
        weatherTr.appendChild(weatherTd)
    })

    // attach rows to table
    thead.appendChild(theadtr)

    tbody.appendChild(midnightTr)
    tbody.appendChild(oneamTr)
    tbody.appendChild(twoamTr)
    tbody.appendChild(threeamTr)
    tbody.appendChild(fouramTr)
    tbody.appendChild(fiveamTr)
    tbody.appendChild(sixamTr)
    tbody.appendChild(sevenamTr)
    tbody.appendChild(eightamTr)
    tbody.appendChild(nineamTr)
    tbody.appendChild(tenamTr)
    tbody.appendChild(elevenamTr)
    tbody.appendChild(noonTr)
    tbody.appendChild(onepmTr)
    tbody.appendChild(twopmTr)
    tbody.appendChild(threepmTr)
    tbody.appendChild(fourpmTr)
    tbody.appendChild(fivepmTr)
    tbody.appendChild(sixpmTr)
    tbody.appendChild(sevenpmTr)
    tbody.appendChild(eightpmTr)
    tbody.appendChild(ninepmTr)
    tbody.appendChild(tenpmTr)
    tbody.appendChild(elevenpmTr)
    tbody.appendChild(totalTr)

    tbody.appendChild(highTr)
    tbody.appendChild(lowTr)
    tbody.appendChild(weatherTr)

    frag.appendChild(thead)
    frag.appendChild(tbody)

    return frag
}

// generate misc. report metadata
function make_report_subheader(data) {
    const frag = document.createDocumentFragment()

    const id = document.createElement('span')
    const ampeak = document.createElement('span')
    const pmpeak = document.createElement('span')
    const project = document.createElement('span')
    const countDir = document.createElement('span')
    const trafficDir = document.createElement('span')
    const axle = document.createElement('span')
    const seq = document.createElement('span')
    const aadJawn = document.createElement('span')
    const offset = document.createElement('span')

    id.classList.add('subheader-span')
    ampeak.classList.add('subheader-span')
    pmpeak.classList.add('subheader-span')
    project.classList.add('subheader-span')
    countDir.classList.add('subheader-span')
    trafficDir.classList.add('subheader-span')
    axle.classList.add('subheader-span')
    seq.classList.add('subheader-span')
    aadJawn.classList.add('subheader-span')
    offset.classList.add('subheader-span')

    id.innerHTML = `<span>Station ID</span> ${data.station_id}`
    ampeak.innerHTML = `<span>AM Peak</span> ${data.am_peak}, ${data.am_ending}`
    pmpeak.innerHTML = `<span>PM Peak</span> ${data.pm_peak}, ${data.pm_ending}`
    project.innerHTML = `<span>Project</span> ${data.project}`
    countDir.innerHTML = `<span>Count Direction</span> ${data.counter_direction}`
    trafficDir.innerHTML = `<span>Traffic Direction</span> ${data.traffic_direction}`
    axle.innerHTML = `<span>Axle</span> ${data.AXLE}`
    seq.innerHTML = `<span>Segment</span> ${data.SEQ}`
    offset.innerHTML = `<span>Offset</span> ${data.offset}`
    
    // handle whatever this is
    if(data.AADT) {
        aadJawn.innerHTML = `<span>AADT</span> ${data.AADT}`
    }else if(data.AADB) {
        aadJawn.innerHTML = `<span>AADB</span> ${data.AADB}`
    }else if(data.AADP) {
        aadJawn.innerHTML = `<span>AADP</span> ${data.AADP}`
    }

    frag.appendChild(id)
    frag.appendChild(ampeak)
    frag.appendChild(pmpeak)
    frag.appendChild(project)
    frag.appendChild(countDir)
    frag.appendChild(trafficDir)
    frag.appendChild(axle)
    frag.appendChild(seq)
    frag.appendChild(offset)
    frag.appendChild(aadJawn)

    return frag
}

// @TODO: test logic after zoom & circle styles are fixed
    // syncMapTable = true
    // zoom back to search boundary
    // remove circle style
    // searchArea global has the jawn
function back_to_results() {
    syncMapTable = true // recalculate data table
    remove_sidebar_report()
    map.fitBounds(searchArea);

    // @TODO: remove active circle style
    map._layers[activeCircleId].setStyle({
        weight: 1,
        radius: 5,
        fillOpacity: 0.8
    });
}

// generate template
function create_sidebar_report(data) {
    // report
    const report = document.createElement('section')

    // back arrow
    const back = document.createElement('button')

    // header elements
    const header = document.createElement('header')
    const headerTextWrapper = document.createElement('div')
    const name = document.createElement('h2')
    const countContext = document.createElement('h3')
    const downloadBtn = document.createElement('btn')

    // table elements
    const overflow = document.createElement('div')
    const table = document.createElement('table')

    // subheader elements
    const subheader = document.createElement('div')

    // classes & id's
    report.id = 'report'

    report.classList.add('report')

    back.classList.add('report-back-btn')
    header.classList.add('flex-row', 'flex-align-center', 'flex-between', 'report-header')
    headerTextWrapper.classList.add('flex-column', 'header-text')
    name.classList.add('report-road-name')

    countContext.classList.add('count-context')
    downloadBtn.classList.add('report-download-btn', 'btn-primary')

    overflow.classList.add('report-table-overflow')
    table.classList.add('report-table','table', 'table-striped', 'table-bordered', 'dataTable', 'no-footer')
    subheader.classList.add('subheader', 'flex-row', 'flex-align-center', 'flex-wrap')

    // attributes
    table.role = 'grid'

    // text
    back.innerHTML = '&#8592;'
    const srOrI = data.SR ? 'State Route '+  data.SR : 'State Route ID ' + data.SRI
    name.innerHTML = `${data.road} <small>${srOrI} | #${data.record_num}</small>`
    countContext.innerHTML = `<span class="count-type ${data.count_type.toLowerCase()}">${data.count_type} count</span>  | ${data.municipality.toLowerCase()} | ${data.county.toLowerCase()}`
    downloadBtn.textContent = 'Download as CSV'

    // generate data
    const tableData = make_report_table_content(data.counts)
    const subheaderData = make_report_subheader(data)

    // event handlers
    back.onclick = () => back_to_results()

    downloadBtn.onclick = () => fetch_csv(data.record_num)

    // build tree
    headerTextWrapper.appendChild(name)
    headerTextWrapper.appendChild(countContext)
    header.appendChild(headerTextWrapper)
    header.appendChild(downloadBtn)

    table.appendChild(tableData)
    overflow.appendChild(table)

    subheader.appendChild(subheaderData)

    report.appendChild(back)
    report.appendChild(header)
    report.appendChild(overflow)
    report.appendChild(subheader)

    return report
}

// add template
function add_sidebar_report(report) {
    // hide data table
    // @eventually: create class to fade table out
    const tableWrapper = document.getElementById('table_wrapper')
    tableWrapper.style.display = 'none'

    $('#results-panel').append(report)
}

// go back to results table
function remove_sidebar_report() {
    // destroy the report
    $('#report').remove()

    // reveal the table
    const tableWrapper = document.getElementById('table_wrapper')
    tableWrapper.style.display = 'initial'

}

// click report btn handling
$(document.body).on('click', '#table tbody td', function() {

    if (table.cell(this).index().column === 4) {
        var trow = table
            .cell(this)
            .index().row;
        var datarow = table.row(trow)
            .data();

        const makeCircle = fetch_report_data(datarow.recnum)

        if(makeCircle) {
            var mo_row = table.cell(this).index().row;
            var mo_data = table.row(mo_row).data();
            const latLng = mo_data.latlng
            syncMapTable = false // don't recalculate data table

            map.setView([latLng.lat, latLng.lng], 19) // @NOTE: map.flyTo is undefined, for some reason
            
            // @TODO: add active circle style
            map._layers[activeCircleId].setStyle({
                weight: 3,
                radius: 10,
                fillOpacity: 1.0
            });
        }
    }
});

$(document.body).on('mouseover', '#table tbody td', function() {
    if (tableExists && TCtable.length) {
        var mo_row = table.cell(this).index().row;
        var mo_data = table.row(mo_row).data();
        activeCircleId = mo_data.unid
        map._layers[mo_data.unid].setStyle({
            weight: 3,
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

// handle search by record number form
$('#rec-num-submit').on('click', function(e) {
    var form = $('#recnum-form');
    var recs = $(form).find('#records').val();
    if(recs === 'tasty time' || recs === 'gusgus' || recs === 'goodbye brady'){
        partyTime(recs);

    } else {
        search_by_number(recs);     
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
        iframe.src = 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/18608884&amp;color=ff5500&amp;auto_play=true&amp;hide_related=false&amp;show_comments=false&amp;show_user=false&amp;show_reposts=false'; 
    } else if (dude === 'goodbye brady') {
        iframe.src = 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/108456959&amp;color=ff5500&amp;auto_play=true&amp;hide_related=false&amp;show_comments=false&amp;show_user=false&amp;show_reposts=false'; 
    }
    
    tasty.appendChild(iframe);
    document.body.appendChild(tasty);

    $('#records').val('');
}


function getDynTableHeight() {
    return ($('#results-panel').height() -
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
        table.page.len(Math.max(1, (Math.floor(getDynTableHeight() - 20) / 38.5) - 1)).draw();
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
