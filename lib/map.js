//declare boundary of region
var oLat = 40.018, oLng = -75.148, zLevel = 10;             ///adjust lat-lon coordinates to center on your region


///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
/////////      Declare Query Data        ///////////////////
//////////////////////////////////////////////////////////////////
var searchArea, TCresults, queryValue, queryLayer, queryName, locationQuery=[], queryType='location', animating = false, yearQuery = [],table;
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var tableExists = false;    


//Parse the search data and create the autocomplete function
$.getJSON('./data/municipal.json', processData);

function processData(json){
    var rows = json.features;
    
    $.each(rows, function(i,location){
        locationQuery.push({
            name: location.attributes.MUN_NAME,
            layer: '2',
            value: location.attributes.OBJECTID,
            source: 'locations'
        });
    });
    var locationBH = new Bloodhound({
        name: 'locations',
        datumTokenizer: function(d){
            return Bloodhound.tokenizers.whitespace(d.name)},
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        // `states` is an array of state names defined in "The Basics"
        local: locationQuery,
        limit: 5
    });
    locationBH.initialize();
    $('#userQuery').typeahead({
        hint: true,
        highlight: true,
        minLength: 1,
        limit: 5
        },
        {
          name: 'locations',
          displayKey: 'name',
          source: locationBH.ttAdapter()
    }).on("typeahead:selected",function(obj, datum){
        queryLayer = datum.layer;
        queryName = datum.name;
        queryValue = datum.value;
    });
}
           

//declare basemaps
// Basemap Layers
var Esri_WorldImagery = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

 var CartoDB_Positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
});

var Esri_WorldGrayCanvas = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
});

var map;
//create map instance
function createMap(){
    map = L.map("mapDIV", {
        minZoom: zLevel,
        zoomControl: false,
      //  layers: [Esri_WorldGrayCanvas]
        layers: [CartoDB_Positron]
    }).setView([oLat, oLng],zLevel);
        var baseLayers = {
        "Satellite": Esri_WorldImagery,      
    //    "Street Map": Esri_WorldGrayCanvas
        "Street Map": CartoDB_Positron
    };
  //  L.control.layers(baseLayers).addTo(map);

  var mcd = L.esri.featureLayer({
    url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Boundaries/DVRPC_Boundaries/FeatureServer/2',
    simplifyFactor: 0.5,
    precision: 5,
    style: {
                color: 'grey',
                weight: 1.5,
                fill: false,
                opacity: 0.6,
                clickable: false
            }
  }).addTo(map);

  var county = L.esri.featureLayer({
    url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Boundaries/DVRPC_Boundaries/FeatureServer/1',
    simplifyFactor: 0.5,
    precision: 5,
    style: {
                color: 'grey',
                weight: 4,
                fill: false,
                opacity: 0.6,
                clickable: false
            }
  }).addTo(map);
    /////////////////////////////////////////////
    ////// Draw search area
    ////////////////////////////////////////////

    // Initialise the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polygon: {
                    allowIntersection: false, // Restricts shapes to simple polygons
                    drawError: {
                        color: '#e1e100', // Color the shape will turn when intersects
                        message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                    },
                    shapeOptions: {
                        weight: 5,
                        color: '#5876A2'
                    }
                }
        },
        edit: false
            
    });
    map.addControl(drawControl);
    map.addControl( L.control.zoom({position: 'topleft'}) );

    // handle start of new custom search area
    map.on('draw:drawstart', function (e) {
        if(searchArea !== null){ map.removeLayer(searchArea); }   //clear current search area from map
        if(TCresults !== null){ TCresults.clearLayers(); }     //clear previous search results
        
    });

    // handle completion of custom search area draw event
    map.on('draw:created', function (e) {
        searchArea = e.layer;

        // add custom search area to map
        map.addLayer(searchArea);
        searchArea.setStyle({
            weight: 5,
            color: '#5876A2',
            fill: false,
            opacity: 0.7
        });
        map.fitBounds(searchArea.getBounds());
        updateSearchArea(searchArea);
    });
}


//  ****************************************

function fadeLanding(type, layer, value){ 
    $('#TC_header').css({"height":"60px"});
    $('.video-hero').css({'opacity':'0.0'}).delay(800).queue(function(){
        $('.video-hero').hide();
    });
    $('#landingSearch').css({"opacity":"0.0"}).html();
    $('#container').addClass('mapView');
    //var mapContainer = '<div id="mapDIV" class="col-sm-12 col-lg-12" style="opacity:0.0;"></div>';
    $('#landing_map').toggleClass('col-sm-12 col-lg-12 col-sm-6 col-lg-6').delay(790).queue(function(){
        createMap();
        $('#mapDIV').queue(function(){
            switch(type){
                case 'location' : 
                    
                    searchLocation(layer,value);
                    break;
                case 'recnumber' : 
                    //searchRecord(variable);
                    break;
                default : 
                    launchAOI();
                    $('#loading').hide();
            }          
            $('#mapDIV').css({'opacity':'1.0'});    //fade map instance into object   
            $('#container').fadeOut();
        });
    });
}


//  **********************************************

function searchLocation(layer, query){
    L.esri.Tasks.query({
        url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Boundaries/DVRPC_Boundaries/FeatureServer/' + layer
      }).where("OBJECTID='"+query+"'").run(function(error, location){
        // draw neighborhood on the map
        searchArea = L.geoJson(location, {
            style:{
                weight: 5,
                color: '#5876A2',
                fill: false,
                opacity: 0.7
            }
        });

        // fit map to boundry
        map.fitBounds(searchArea.getBounds());
        searchArea.addTo(map);
        updateSearchArea(searchArea);
    });
}

function getValue(type){
    
    switch (type){
        case 'Volume' : return '#1a9850';
        case '15 min Volume' : return '#FEE900';
        case 'Speed' : return '#810f7c';
        case 'Class' : return '#1a9850';
        case 'Manual Class' : return '#F7911E';
        case 'Turning Movement' : return '#EE3224';
        case 'Loop' : return '#c51b7d';
        case '8 Day' : return '#35978f';
        case 'Crosswalk' : return '#6baed6';   
    }
}

//  **********************************************

function updateSearchArea(zone){
    
    $('#loading').show();
    var TypeCriteria = '';
    $('#count_types button').each(function(d){ 
        if($(this).attr('data-render') === 'true'){
            (TypeCriteria.length < 1) ? TypeCriteria += ' AND (' : TypeCriteria += ' OR ';
            TypeCriteria += "TYPE ='"+ $(this).attr('data-layer') + "'";
        }
    });
    if(TypeCriteria.length > 1){TypeCriteria += ')';}
    var criteria = "(SETYEAR >=" + min +" AND SETYEAR <=" + max +")"+ TypeCriteria;// OR TYPE = "Class"';
   
    var TCquery = L.esri.Tasks.query({
            url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Transportation/TrafficCounts/MapServer/0'
        })
            .within(zone)
            .where(criteria)
            .run(function(error, results){
                var geojsonMarkerOptions = {
                    stroke: false,
                    //fillColor: TCountColors,
                    radius: 5,
                    fillOpacity: 0.3
            };
            if(TCresults != null){ TCresults.clearLayers(); }
            $('#loading').hide();
            TCresults = L.geoJson(results,{
                pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, {
                                stroke: false,
                                radius: 5,
                                fillOpacity: 0.3,
                                fillColor: getValue(feature.properties.TYPE)
                        });
                    },
                onEachFeature: function(feature, layer){
                    if (feature.properties) {
                        layer.bindLabel(feature.properties.ROAD, { direction: 'auto', className: 'leaflet-label' }); 
                        layer.on({
                            mouseover: function(e) {
                            this.setStyle({radius: 10,fillOpacity: 0.9});},
                            mouseout: function(e) {
                            this.setStyle({radius:5,fillOpacity:0.3});}
                        });              
                }
            },
                });
            TCresults.addTo(map);

            var TCtable=[];

            TCresults.eachLayer(function(m){
                var date = m.feature.properties.SETDATE,
                    road = m.feature.properties.ROAD,
                    type = m.feature.properties.TYPE,
                    aadt = m.feature.properties.AADT,
                    dir = m.feature.properties.CNTDIR,
                    layer = m.feature.id,
                    recnum = m.feature.properties.RECORDNUM,
                    unique = L.stamp(m),
                    dt = new Date(date),
                    MmYear = months[dt.getMonth()] + ' ' + dt.getFullYear(),
                    aadt_form = (aadt != null) ? numeral(aadt).format('0,0') : 'not available'; 
                TCtable.push({"date":MmYear,"road":capitalize(road),"type":capitalize(type),"aadt":aadt_form,"dir":dir,"unid": unique, "layer":layer,"recnum":recnum});
            });

            if(tableExists===false){
                table = $('#table').DataTable({
                    data: TCtable,
                    "columns":[
                        {   //column prep for the collection of saved reports
                            "className": "select-record",
                            "orderable": false,
                            "width": "1%",
                            "data": null,
                            "defaultContent": "<i class='glyphicon glyphicon-unchecked'></i>"
                        },
                        { "data": "date", "title": "Date", "width": "12%"},
                        { "data": "road", "title": "Road", "width": "40%" },
                        // { "data": "dir", "title": "Direction"},
                        { "data": "type", "title": "Type", "width": "20%"},
                        { "data": "aadt", "title": "AADT*", "width": "14%"},
                        { "data": null,"width": "13%", "className": "select-report", "defaultContent": "<i class='glyphicon glyphicon-list-alt' title='download report'></i> report"},
                        { "data": "unid", "visible": false},
                        { "data": "recnum", "title": "Record #","width": "20%","visible": false}
                    ],
                    "order": [[ 1, "desc" ]],
                    "pageLength": 15,
                    "bLengthChange": false,
                });
                $('#table thead th').removeClass('data-link');
                tableExists=true;
            }else{
                var rTable = $('#results-panel')
                    .find("table:first")
                    .dataTable();
                rTable.fnClearTable();
                rTable.fnAddData(TCtable);
            }
            
        });
}



//*****************************************************
// click handling funciton for clicking on the record for a report (individual)

function record_report(dr, typ){
//build functionality for various report types
if  (typ === "Turning Movement"||typ === "Manual Class"||typ === "Crosswalk"){
        window.open('http://www.dvrpc.org/asp/TrafficCountPDF/'+ typ +'/'+ dr +'.pdf','_blank');
    } 
    else {
        window.open('http://www.dvrpc.org/asp/trafficCount/default.aspx?recnum='+ dr, '_blank');
    }
}
//**********************************************************
// checkbox handling for saving a list of records for export later
var download_records=[];
$(document.body).on('click', '#table tbody td.select-record', function () {
    var tr = $(this).closest('tr');
    var row = table.row( tr );
    var check_status = $(this).find('i');
    if(check_status.hasClass('glyphicon-check')){
        //item is already saved for download, remove it form the list
        check_status.toggleClass('glyphicon-check glyphicon-unchecked');
        //create a function to remove the item from the download list
    }else{
        //add item to the download list
        check_status.toggleClass('glyphicon-unchecked glyphicon-check');
        download_records.push({"date": row.date,"road": row.road,"type": row.type,"aadt": row.aadt,"dir": row.dir,"layer": row.layer,"recnum": row.recnum});

    }
   
});
$(document.body).on('click', '#table tbody td', function () {

    if(table.cell(this).index().column === 5){
        var trow = table
                        .cell(this)
                        .index().row;
        var datarow = table.row(trow)
                            .data();
        record_report(datarow.recnum, datarow.type);
    }
});
$(document.body).on('mouseover', '#table tbody td', function () {
    var mo_row = table.cell(this).index().row;
    var mo_data = table.row(mo_row).data();
        map._layers[mo_data.unid].setStyle({radius: 10, fillOpacity: 1.0});
    
});
$(document.body).on('mouseleave', '#table tbody td', function () {
    var mo_row = table.cell(this).index().row;
    var mo_data = table.row(mo_row).data();
        map._layers[mo_data.unid].setStyle({radius: 5, fillOpacity: 0.3});
    
});

// **********************************************

function launchAOI(){

}

function capitalize(s){
    return s.toLowerCase().replace( /\b./g, function(a){ return a.toUpperCase(); } );
};


//  ***********************************************
// button handling

$('#updateSearchbtn').on('click', function(){
    updateSearchArea(searchArea);
    $('#filterBtn').trigger('click');
})

$('#homeLocSearch').on('click', function(){
    fadeLanding(queryType,queryLayer, queryValue);
    var searchItem = $("#userQuery").val();     
});

$('#aoiSearch').on('click', function(){
    queryType = 'aoi';
    fadeLanding(queryType,queryLayer, queryValue);    
});

$('#filterBtn').on('click', function(){
    var filterStatus = $('#preFilter').text();
    if(filterStatus === 'Hide'){
        $('#preFilter').text('Show');
    }else{$('#preFilter').text('Hide');}
});
$('#count_types button').on('click', function(){
    ($(this).attr('data-render') === 'true')? $(this).attr('data-render', 'false') : $(this).attr('data-render', 'true');
    $(this).toggleClass('inactive');
});

///////////////////////////////////////////////
//date selection slider powered by noUiSlider
////////////////////////////////////////////////

var min = 1999, max = (new Date).getFullYear(), density= max - min,
yearSlider = document.getElementById("yearSlider");

function filterdates( value, type ){
    return value % 5 ? 2 : 1;
}
noUiSlider.create(yearSlider,{
    start: [1999, 2015],
    connect: true,
    step: 1,
    behaviour: 'tap-snap',
    range: {
        'min': min,
        'max': max
    },
    pips: {
        mode: 'steps',
        filter: filterdates,
        density: density
    }
});

yearSlider.noUiSlider.on('update', function(values, handle){
    $('#yearMin').text(Math.round(values[0]));
    $('#yearMax').text(Math.round(values[1]));
    min = Math.round(values[0]), max = Math.round(values[1]);
});



//draw toolbar modifications
L.drawLocal.draw.toolbar.buttons.polygon = 'Draw a custom search area';

;(function(){
    

    if (window.jQuery) {

        // jQuery version
        $(document).ready(function(){

            // Add a 'js' class to the html tag
            // If you're using modernizr or similar, you
            // won't need to do this
            $('html').addClass('js');

            // Fade in videos
            var $fade_in_videos = $('.video-bg video');
            $fade_in_videos.each(function(){
                if( $(this)[0].currentTime > 0 ) {
                    // It's already started playing
                    $(this).addClass('is-playing');
                } else {
                    // It hasn't started yet, wait for the playing event
                    $(this).on('playing', function(){
                        $(this).addClass('is-playing');
                    });
                }
            });

            // Scrap videos on iOS because it won't autoplay,
            // it adds it's own play icon and opens the
            // media player when clicked
            var iOS = /iPad|iPhone|iPod/.test(navigator.platform) || /iPad|iPhone|iPod/.test(navigator.userAgent);
            if( iOS ) {
                $('.video-bg video').remove();
            }

        });

    }

})();
