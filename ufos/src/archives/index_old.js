var width = 960,
    height = 500,
    active = d3.select(null);

// range of the chloropleth map
var lowColor = '#f7fbff'
var highColor = '#08306b'

var projection = d3.geoAlbersUsa()
    //.scale(1000)
    .translate([width / 2, height / 2]) // translate to center of screen
    .scale([1000]); // scale things down so see entire US

var zoom = d3.zoom()
    .on("zoom", zoomed);

var initialTransform = d3.zoomIdentity
    .translate(0,0)
    .scale(1);

// define path generator
var path = d3.geoPath() // path generator that will convert GeoJSON to SVG paths
    .projection(projection); // tell path generator to use albersUsa projection

// create svg element and append map to svg
var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", reset);

var g = svg.append("g");

svg
    .call(zoom) // delete this line to disable free zooming
    .call(zoom.transform, initialTransform);

// TODO - load in the UFO data
// wrap around geo data so we can append the d3 scale range
// calculate the value per state in order to fill with chloropleth

// load GeoJSON data and merge with UFO data
d3.json("https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/us.json", function(error, us) {
    if (error) throw error;

    // Bind the data to the SVG and create one path per GeoJSON feature
    g.selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", "feature")
        .on("click", clicked);

    g.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("class", "mesh")
        .attr("d", path);
});

function clicked(d) {
    if (active.node() === this) return reset();
    active.classed("active", false);
    active = d3.select(this).classed("active", true);

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    var transform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale);

    svg.transition()
        .duration(750)
        .call(zoom.transform, transform);
}

function reset() {
    active.classed("active", false);
    active = d3.select(null);

    svg.transition()
        .duration(750)
        .call(zoom.transform, initialTransform);
}

function zoomed() {
    var transform = d3.event.transform;

    g.style("stroke-width", 1.5 / transform.k + "px");
    g.attr("transform", transform);
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
    if (d3.event.defaultPrevented) d3.event.stopPropagation();
}

//data - fake input
data = [{ Date: '1/1/2004 12:00:00 AM', City: 'New York (Brooklyn)', State: 'NY', Shape: 'Chevron', Duration: '10 minutes', Summary: 'I saw something', Posted: '3/4/2008'},
        { Date: '1/2/2004 11:00:00 AM', City: 'Boston', State: 'MA', Shape: 'Light', Duration: '1 min', Summary: 'I saw something too', Posted: '4/4/2008'}];

//cities - fake input
/*cities = d3.csv("/data/uscities.csv" ,function(error, cities) {
    if (error) throw error;
    cities.forEach(function(c) {
        c.lat = +c.lat;
        c.lng = +c.lng;
    });
    console.log(cities[0]);
});
*/

cities = [{city:"New York", state_id: "NY", lat: 40.730610, lng:-73.935242},
          {city:"Boston", state_id: "MA", lat: 42.361145, lng: -71.057083}];

//join city coordinates to the data
data.forEach(function(d) {
    var result = cities.filter(function(c) {
        var city_re = new RegExp(c.city); //create regular expression from city name
        return city_re.test(d.City); //and check if it is a substring of the location of the sighting
    });
    d.Coord = (result[0] !== undefined) ? [result[0].lng, result[0].lat] : null;
});

//tooltip
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style('border', '1px solid black') //comment to remove tooltip box
    .style("padding", "5px")
    .style("position", "absolute") //comment if you want static tooltip
    .style("z-index", "10")
    .style("opacity", 0);


var symbol = d3.symbol();

//draw points
var dots = svg.selectAll(".dots")
    .data(data)
    .enter()
    .append("path")
    .attr("class", "dots")
    .on("mouseover", function(d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr("stroke", "black");
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
        tooltip.html("Location: "+d.City+", "+d.State+"<br/> Date:"+d.Date+"<br/> Duration: "+d.Duration+"<br/> Shape: "+d.Shape+"<br/> Description: "+d.Summary)
            .style("left", (d3.event.pageX + 10) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
        d3.select(this).attr("stroke", "#404040");
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    });

//dot style and shape - shapes from https://stackoverflow.com/questions/39760757/d3-scatterplot-from-all-circles-to-different-shapes
dots.attr("d", symbol.type(function (d){return shape(d)}))
    .attr("transform", function(d) { return "translate(" + projection(d.Coord)[0] + "," + projection(d.Coord)[1] + ")"; })
    .attr("fill", "#404040")
    .attr("stroke-width", 1)
    .attr("stroke", "#404040");

//define shapes categories: round -> circle, pointy -> diamond, light -> cross, undefined -> square
function shape(d) {
    if ((d.Shape === 'Cigar') || (d.Shape === 'Circle') || (d.Shape === 'Cylinder') || (d.Shape === 'Disk') || (d.Shape === 'Egg') || (d.Shape === 'Oval') || (d.Shape === 'Sphere')) {return d3.symbolCircle;}
    else if ((d.Shape === 'Chevron') || (d.Shape === 'Cone') || (d.Shape === 'Diamond') || (d.Shape === 'Rectangle') || (d.Shape === 'Teardrop') || (d.Shape === 'Triangle')) {return d3.symbolDiamond;}
    else if ((d.Shape === 'Fireball') || (d.Shape === 'Flash') || (d.Shape === 'Formation') || (d.Shape === 'Light')) {return d3.symbolCross;}
    else {return d3.symbolSquare;} //Includes shapes: Null, Changing, Other, Unknown
}

