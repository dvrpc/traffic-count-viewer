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
Papa.parse("./data/search_locations.csv", {
    download: true,
    header: true,
    complete: function(results) {
        $.each(results.data, function(i,location){
            locationQuery.push({
                name: location.TERM,
                value: location.OBJECT_ID,
                source: location.LAYER
            });
        });
        var locationBH = new Bloodhound({
            name: 'locations',
            datumTokenizer: function(d){
                return Bloodhound.tokenizers.whitespace(d.name);},
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            // `states` is an array of state names defined in "The Basics"
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
            }, ttoptions_display = {
              name: 'source',
              displayKey: 'name',
              source: locationBH.ttAdapter()
            };
        //landing page query handler
        $('#userQuery').typeahead(ttoptions, ttoptions_display).on("typeahead:selected",function(obj, datum){
            queryLayer = datum.source;
            queryName = datum.name;
            queryValue = datum.value;
        });
        //map interface query handler
        $('#mapQuery').typeahead(ttoptions, ttoptions_display).on("typeahead:selected",function(obj, datum){
            queryLayer = datum.source;
            queryName = datum.name;
            queryValue = datum.value;
            if(map.hasLayer(searchArea)){ map.removeLayer(searchArea); }   //clear current search area from map
            $('.collapse.in').collapse('hide');  
            searchLocation(queryLayer, queryValue);
            $('#mapQuery').typeahead('val', '');
        });

    }
});          

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

var map, polygonDrawer;
//create map instance
function createMap(){
    map = L.map("mapDIV", {
        minZoom: zLevel,
        zoomControl: false,
        layers: [CartoDB_Positron]
    }).setView([oLat, oLng],zLevel);
        var baseLayers = {
        "Satellite": Esri_WorldImagery,    
        "Street Map": CartoDB_Positron
    };

  var county = L.esri.featureLayer({
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

   map.addControl( L.control.zoom({position: 'topleft'}) );

    // handle start of new custom search area
    map.on('click', function (e) {
         $('#aoi-help').collapse('hide'); 

    });
    map.on('draw:drawstart', function (e) {
        $('#noresults').hide();
    });

    // handle completion of custom search area draw event
    map.on('draw:created', function (e) {
        if(map.hasLayer(searchArea)){ map.removeLayer(searchArea); }   //clear current search area from map
        if(map.hasLayer(TCresults)){ map.removeLayer(TCresults); }
        $('#aoi-draw').collapse('hide');
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

    // Define you draw handler somewhere where you click handler can access it. N.B. pass any draw options into the handler
    polygonDrawer = new L.Draw.Polygon(map);
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
                    polygonDrawer.enable();  
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
        url: get_query_url(layer)})
            .where( get_key_field(layer) +"='"+query+"'").run(function(error, location){
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

function get_key_field(layer){
    switch (layer){
        case 'zip': return 'OBJECTID';
        case 'mun_boundary': return 'OBJECTID';
        case 'neighborhood': return 'FID';
    }
}

function get_query_url(layer){
    switch (layer){
        case 'zip': return 'http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_ZIP_Codes_2014/FeatureServer/0';
        case 'mun_boundary': return 'http://arcgis.dvrpc.org/arcgis/rest/services/Boundaries/DVRPC_Boundaries/FeatureServer/2';
        case 'neighborhood': return 'http://services.arcgis.com/rkitYk91zieQFZov/ArcGIS/rest/services/Philadelphia_Neighborhoods/FeatureServer/0';
    }
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

function processRoadname(f){
    if(f.RDPREFIX !== " "){
        return f.RDPREFIX.toUpperCase() + ' ' + f.ROUTE + ' ('+capitalize(f.ROAD)+')';
    }else{
        return capitalize(f.ROAD);
    }
}

//  **********************************************
// prep table data for results table

var column_options = [
     {   //column prep for the collection of saved reports
        "className": "select-record",
        "orderable": false,
        "width": "1%",
        "data": null,
        "defaultContent": "<i class='glyphicon glyphicon-unchecked'></i>"
    },
    { "data": "date", "title": "Date", "width": "12%"},
    { "data": "road", "title": "Road", "width": "35%" },
    { "data": "type", "title": "Type", "width": "20%"},
    { "data": "aadt", "title": "AADT*", "width": "11%"},
    { "data": "report","title":"File Number", "width": "13%", "className": "select-report"},
    { "data": "unid", "visible": false},
    { "data": "recnum", "title": "Record #","visible": false}
];

//build table
table = $('#table').DataTable({
    data: null,
    "columns":column_options,
    "order": [[ 1, "desc" ]],
    "pageLength": 15,
    "bLengthChange": false,
    "oLanguage":{
        "sSearch": 'Filter results:'
    }
});
$('#table thead th').removeClass('data-link');
tableExists=true;


function updateSearchArea(zone){
    //hide dialogs and collapse panels
    $('#loading').show();
    $('.collapse.in').collapse('hide'); 
    $('#noresults').hide();
    var TypeCriteria = '';
    $('#count_types button').each(function(d){ 
        if($(this).attr('data-render') === 'true'){
            (TypeCriteria.length < 1) ? TypeCriteria += ' AND (' : TypeCriteria += ' OR ';
            TypeCriteria += "TYPE ='"+ $(this).attr('data-layer') + "'";
        }
    });
    if(TypeCriteria.length > 1){TypeCriteria += ')';}
    var criteria = "(SETYEAR >=" + min +" AND SETYEAR <=" + max +")"+ TypeCriteria;// OR TYPE = "Class"';
   
    var TCquery = L.esri.Tasks.query({url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Transportation/TrafficCounts/MapServer/0'})
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
                        layer.bindLabel(processRoadname(feature.properties), { direction: 'auto', className: 'leaflet-label' }); 
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
                    road = processRoadname(m.feature.properties), 
                    type = m.feature.properties.TYPE,
                    aadt = m.feature.properties.AADT,
                    cntdir = m.feature.properties.CNTDIR,
                    layer = m.feature.id,
                    recnum =  m.feature.properties.RECORDNUM,
                    report =  '<button type="button" class="btn btn-primary btn-xs">'+m.feature.properties.RECORDNUM + '&nbsp;<i class="glyphicon glyphicon-new-window" title="download report"></i></button>',
                    unique = L.stamp(m),
                    dt = new Date(date),
                    MmYear = '<span class="hidden">' + dt.getFullYear() + dt.getMonth() + dt.getDate() + '</span>'+ months[dt.getMonth()] + ' ' + dt.getFullYear(),
                    aadt_form = (aadt !== 0) ? numeral(aadt).format('0,0') : 'n/a'; 
                TCtable.push({"date":MmYear,"road":road,"type":capitalize(type),"aadt":aadt_form,"cntdir":cntdir,"unid": unique, "layer":layer,"recnum":recnum, "report":report});
            });
            
            if(TCtable.length !== 0){
                var rTable = $('#results-panel')
                    .find("table:first")
                    .dataTable();
                rTable.fnClearTable();
                rTable.fnAddData(TCtable);
            }else{ 
                var jTable = $('#results-panel')
                    .find("table:first")
                    .dataTable();
                jTable.fnClearTable();
                // launch message expressing no results available
                $('#noresults').show();
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
    var row = table.row( tr ).data();
    var check_status = $(this).find('i');
    if(check_status.hasClass('glyphicon-check')){
        //item is already saved for download, remove it form the list
        check_status.toggleClass('glyphicon-check glyphicon-unchecked');
        
        //remove the item from the download list
        var id = row.recnum;
        for(var i = 0; i < download_records.length; i++) {
            if(parseInt(download_records[i].properties.RECORDNUM) == id) {
                download_records.splice(i, 1);
                break;
            }
        }
    }else{
        //add item to the download list
        check_status.toggleClass('glyphicon-unchecked glyphicon-check');        
        download_records.push(map._layers[row.unid].feature);
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

function capitalize(s){
    return s.toLowerCase().replace( /\b./g, function(a){ return a.toUpperCase(); } );
}


//  ***********************************************
// button handling

$('#updateSearchbtn').on('click', function(){
    updateSearchArea(searchArea);
    $('.collapse.in').collapse('hide');
});

$('#homeLocSearch').on('click', function(){
    fadeLanding(queryType,queryLayer, queryValue);    
});

$('#aoiSearch').on('click', function(){
    queryType = 'aoi';
    fadeLanding(queryType,queryLayer, queryValue); 
    $('#aoi-help').collapse('show');

});

$('#filterBtn').on('click', function(){
    $('.collapse.in').collapse('hide');
});

$('#count_types button').on('click', function(){
    ($(this).attr('data-render') === 'true')? $(this).attr('data-render', 'false') : $(this).attr('data-render', 'true');
    $(this).toggleClass('inactive');
});

$('#searchBtn').on('click', function(){
   $('.collapse.in').collapse('hide');
});

$('#doaSearch').on('click', function(){
    polygonDrawer.enable();

    $('.collapse.in').collapse('hide');
});
$('#draw-cancel').on('click', function(){
    polygonDrawer.disable();
    $('#aoi-draw').collapse('hide');
});
$('#delete-last').on('click', function(){
    polygonDrawer.deleteLastVertex();
});
$('#aoi-help').on('click', function(){ 
    $('#aoi-help').collapse('hide');
});

$('#filter').on('hide.bs.collapse', function (e) {
    $('#preFilter').text('Show');
});
$('#filter').on('show.bs.collapse', function (e) {
    $('#preFilter').text('Hide');
});


$('#download_all').on('click', function(){
    //create the JSON and CSV data elements
    var dwnld_json = '{"type": "FeatureCollection","features": '+JSON.stringify(download_records)+'}';
    var data_properties = [];
    $.each(download_records,function(i, record){
        data_properties.push(record.properties);
    });
    var data_csv = Papa.unparse(data_properties);

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
    start: [1999, max],
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
