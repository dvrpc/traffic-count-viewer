//declare boundary of region
var oLat = 40.018, oLng = -75.148, zLevel = 10;             ///adjust lat-lon coordinates to center on your region


///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
/////////      Declare Query Data        ///////////////////
//////////////////////////////////////////////////////////////////
var searchArea, TCresults, queryValue, queryLayer, queryName, locationQuery=[], queryType='location', animating = false, yearQuery = [];


//Parse the search data and create the autocomplete function
$.getJSON('./data/municipal.json', processData)

function processData(json){
    var rows = json.features;
    //console.log(rows);
    $.each(rows, function(i,location){
        locationQuery.push({
            name: location.attributes.MUN_NAME,
            layer: '2',
            value: location.attributes.OBJECTID,
            source: 'locations'
        })
    })
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
        layers: [Esri_WorldGrayCanvas]
    }).setView([oLat, oLng],zLevel);
        var baseLayers = {
        "Satellite": Esri_WorldImagery,      
        "Street Map": Esri_WorldGrayCanvas
    };
    //L.control.layers(baseLayers).addTo(map);


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
    map.addControl( L.control.zoom({position: 'topleft'}) )

    map.on('draw:drawstart', function (e) {
        if(searchArea != null){map.removeLayer(searchArea);}   //clear current search area from map
        if(TCresults != null){TCresults.clearLayers();}     //clear previous search results
    });

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
    $('#landingSearch').css({"opacity":"0.0"}).html();
    $('#container').addClass('mapView');
    //var mapContainer = '<div id="mapDIV" class="col-sm-12 col-lg-12" style="opacity:0.0;"></div>';
    $('#landing_map').toggleClass('col-sm-12 col-lg-12 col-sm-6 col-lg-6').delay(790).queue(function(){
        createMap();
        $('#mapDIV').queue(function(){
            switch(type){
                case 'location' : 
                    console.log('conducted query on server');
                    
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

//  **********************************************

function updateSearchArea(zone){
    
    $('#loading').show();
    var criteria = 'SETYEAR >=' + min +' AND SETYEAR <=' + max;
    var TCquery = L.esri.Tasks.query({
            url: 'http://arcgis.dvrpc.org/arcgis/rest/services/Transportation/TrafficCounts/MapServer/0'
        })
            .within(zone)
            .where(criteria)
            .run(function(error, results){
                var geojsonMarkerOptions = {
                    stroke: false,
                    fillColor: '#FF8800',
                    radius: 5,
                    fillOpacity: 0.3
            };
            if(TCresults != null){TCresults.clearLayers();}
            $('#loading').hide();
            TCresults = L.geoJson(results,{
                pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, geojsonMarkerOptions);
                    }
                });
            TCresults.addTo(map);
            
        });
}

// **********************************************

function launchAOI(){

}

//  ***********************************************
// button handling

$('#updateSearchbtn').on('click', function(){
    updateSearchArea(searchArea);
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


///////////////////////////////////////////////
//date selection slider powered by noUiSlider
////////////////////////////////////////////////

var min = 1999, max = (new Date).getFullYear(), density= max-min,
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


