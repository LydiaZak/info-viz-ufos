var width = 800;
var height = 500;

// set projection
var projection = d3.geoAlbersUsa().translate([width/2, height/2]); //d3.geoMercator();
var path = d3.geoPath().projection(projection);

// create svg variable
var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

var mapTooltip = d3.select("body").append("div")
    .attr("class", "tooltipMap")
    .style("opacity", 0);

var comments = d3.select("#comments").append("div")
    .attr("class", "comments");

//creates map of US
// https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/us.json
d3.json("https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/us.json", function(error,topo) { // function(us){

    console.log(topo);
    states = topojson.feature(topo, topo.objects.states).features

    // add states from topojson
    svg.selectAll("path")
        .data(states).enter()
        .append("path")
        .attr("class", "feature")
        .style("fill", "#333") // change map background
        .attr("d", path)
        .attr("class", "states");
});

// read the data set, and put into variable
d3.csv("./data/scrubbed.csv",
    function(data){
        initialData = data;
        addSightingsByYear(data);
    }
);

//fills the map with locations of the sightings by year
function addSightingsByYear(){
    //remove all current sightings for updateCommands
    d3.selectAll(".sightings").remove();

    //get the current year
    var selectedYear = document.getElementById("slider").value;

    //filter our data: get sightings by year
    var sightingsByYear = initialData.filter(
        function(d) {
            if(d.country == "us") {
                return d.year == selectedYear;
            }
        }
    );


    //populate map with sightings by year (dots)
    var sightings = svg.selectAll(".sightings")
        .data(sightingsByYear).enter()
        .append("circle")
        .attr("cx", function(d) {
                return projection([d.longitude, d.latitude])[0];
            }
        )
        .attr("cy", function(d){
                return projection([d.longitude, d.latitude])[1];
            }
        )
        //.attr("transform", function(d) { return "translate(" + projection(d.longitude)[0] + "," + projection(d.latitude)[1] + ")"; })
        .attr("r", 2)
        .attr("class", "sightings");

    // hover over / on demand details
    sightings.on("mouseover",
        function(d){
            mapTooltip.transition()
                .duration(250)
                .style("opacity", 1);

            mapTooltip.html(d.city + ", " + d.state + " Shape: " + d.shape)
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

            comments.transition()
                .duration(250)
                .style("opacity", 1);

            comments.html("<strong>Comments:</strong> " +d.comments);
        }
    );

    sightings.on("mouseout",
        function(d){
            mapTooltip.transition()
                .duration(250)
                .style("opacity", 0);

            comments.transition()
                .duration(250)
                .style("opacity", 0);
        }
    );

    //update the headers
    updateHeaders(selectedYear, sightingsByYear);

}

//updates the year and count texts
function updateHeaders(year, data){
    //update year text
    d3.select(".year").text("Year: " + year);

    //get number of sightings in that year
    var countByYear = d3.nest()
        .key(
            function(d){
                return d.year;
            }
        )
        .rollup(
            function(values){
                return values.length;
            }
        )
        .entries(data);

    //update number of sightings text
    d3.select(".count").text(
        function(d, i){
            if(countByYear[i] == undefined)
                return "Sightings: 0";
            return "Sightings: " + countByYear[i].value
        }
    );
}

// update map if slider is changed
d3.select("#slider").on("input",
    function() {
        addSightingsByYear();
    }
);

d3.select(self.frameElement).style("height", "675px");


