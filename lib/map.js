//declare boundary of region
var oLat = 40.018, oLng = -75.148, zLevel = 10;             ///adjust lat-lon coordinates to center on your region


///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
/////////      Declare Query Data        ///////////////////
//////////////////////////////////////////////////////////////////
var queryValue, queryLayer, queryName, locationQuery=[], queryType='location';


//Parse the search data and create the autocomplete function
$.getJSON('/data/municipal.json', processData)

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
    L.control.layers(baseLayers).addTo(map);
}




function fadeLanding(type, layer, value){ 
    $('#TC_header').css({"height":"60px"});
    $('#landingSearch').css({"opacity":"0.0"}).html();
    $('#container').addClass('mapView');
    var mapContainer = '<div id="mapDIV" class="col-sm-12 col-lg-12" style="opacity:0.0;"></div>';
    $('#landing_map').toggleClass('col-sm-12 col-lg-12 col-sm-6 col-lg-6').delay(790).queue(function(){
        createMap();                                //create leaflet map instance
        $('#map').queue(function(){
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
            }            
            $('#mapDIV').css({'opacity':'1.0'});    //fade map instance into object   
            $('#container').fadeOut();
        });
    });
}

function searchLocation(layer, query){
    L.esri.Tasks.query({
        url: 'http://dvrpc-gisprod.dvrpc.org:6080/arcgis/rest/services/Boundaries/DVRPC_Boundaries/FeatureServer/' + layer
      }).where("OBJECTID='"+query+"'").run(function(error, location){
        // draw neighborhood on the map
        var searchArea = L.geoJson(location);

        // fit map to boundry
        map.fitBounds(searchArea.getBounds());
        searchArea.addTo(map);
        updateSearchArea(searchArea);
    });
}

function updateSearchArea(zone){
    var TCquery = L.esri.Tasks.query({
            url: 'http://dvrpc-gisdev.dvrpc.org:6080/arcgis/rest/services/Transportation/TrafficCountConceptSL/MapServer/2'
        }).within(zone).run(function(error, results){
            var geojsonMarkerOptions = {
                stroke: false,
                fillColor: '#FF8800',
                radius: 5,
                fillOpacity: 0.3
            };
            var TCresults = L.geoJson(results,{
                pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, geojsonMarkerOptions);
                    }
                });
            TCresults.addTo(map);
        });
}


$('#homeLocSearch').on('click', function(){
    fadeLanding(queryType,queryLayer, queryValue);
    var searchItem = $("#userQuery").val();     
});


///////////////////////////////////////////////
//suggested results funcitonality for query using typeahead



function processLocationSearch(value){

}