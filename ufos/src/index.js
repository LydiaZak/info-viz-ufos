
// globals
var width = 0;
var height = 0;
var projection = 0;
var path = 0;
var svg = 0;
var initialData = {};
var sightingsByYearCountData = {};
var attributeArray = [];
var currentAttribute = 0;

// color for choropleth map and scatter plot
var color = d3.scaleThreshold()
    .domain([0.24, 0.28, 0.32])
    .range(['#fbb4b9', '#f768a1', '#c51b8a', '#7a0177']);

var mapTooltip = d3.select("body").append("div")
    .attr("class", "tooltipMap")
    .style("opacity", 0);

var comments = d3.select("#comments").append("div")
    .attr("class", "comments");


/**
 * Initialize.
 */
function init() {
    // loads the data, processes it, then creates map and charts
    loadData();
    //setMap(); TODO REMOVE
}



/**
 * Loads the data.
 * https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/us.json
 */
function loadData() {
    d3.queue()   // queue function loads all external data files asynchronously
        .defer(d3.json, "us.json")  // our geometries
        .defer(d3.csv, "./data/scrubbed.csv")  // and associated data in csv file
        .await(processData);   // once all files are loaded, call the processData function passing
                               // the loaded objects as arguments
}

/**
 * Process the data.
 * @param error
 * @param topo
 * @param data
 */
function processData(error,topo,data) {
    if (error) {
        throw error
    }

    var results = data[0];
    var features = topo; //data[1].features

    var components = [
        choropleth(features), // draw map
        scatterplot(onBrush)
    ]

    function update() {
        components.forEach(function (component) {
            component(results)
        })
    }

    function onBrush(x0, x1, y0, y1) {
        var clear = x0 === x1 || y0 === y1
        data.forEach(function (d) {
            d.filtered = clear ? false
                : d.avgDurationSecs < x0 || d.avgDurationSecs > x1 || d.sightingCountsByState < y0 || d.sightingCountsByState > y1
        })
        update()
    }

    update()

    sightingsByYearCountData = aggregationsByYear(data);
    initialData = data;
    //drawMap(topo); TODO
    addSightingsByYear(); // data
}

// TODO
function aggregationsByYear(data) {

}

// TODO
/**
 * Sets up the map
 */
// function setMap() {
//     width = 800;
//     height = 500;
//
//     // set projection
//     projection = d3.geoAlbersUsa()
//         .translate([width/2, height/2]) // translate to center of screen
//         .scale([1000]); // scale things down so see entire US
//
//     path = d3.geoPath() //convert GeoJSON to SVG paths
//         .projection(projection); // tell path generator to use albersUsa projection
//
//     // create svg variable for map
//     svg = d3.select("#map").append("svg")
//         .attr("width", width)
//         .attr("height", height);
// }

function choropleth(features) {
    width = 800;
    height = 500;

    projection = d3.geoAlbersUsa()
        .translate([width/2, height/2]) // translate to center of screen
        .scale([1000]); // scale things down so see entire US
        // .scale([width * 1.25])
        // .translate([width / 2, height / 2])

    // convert GeoJSON to SVG paths.
    // tell path generator to use albersUsa projection
    path = d3.geoPath().projection(projection)

    // create svg variable for map
    svg = d3.select('#map')
        .append('svg')
        .attr('width', width)
        .attr('height', height)

    // draw the map
    svg.selectAll('path')
        //.data(features)
        .data(topojson.feature(features, features.objects.states).features)  // bind data to these non-existent objects
        .enter()
        .append('path') // prepare data to be appended to paths
        .attr('d', path) // create them using the svg path generator defined above
        .style('stroke', '#fff')
        .style('stroke-width', 1)

    return function update(data) {
        svg.selectAll('path')
            .data(data, function (d) { return d.name || d.properties.name })
            .style('fill', function (d) { return d.filtered ? '#ddd' : color(d.sightingCountsByState) })
    }
}

function scatterplot(onBrush) {
    var margin = { top: 10, right: 15, bottom: 40, left: 75 }
    var swidth = 480 - margin.left - margin.right
    var sheight = 350 - margin.top - margin.bottom

    var x = d3.scaleLinear()
        .range([0, swidth])
    var y = d3.scaleLinear()
        .range([sheight, 0])

    var xAxis = d3.axisBottom()
        .scale(x)
        .tickFormat(d3.format('$.2s'))
    var yAxis = d3.axisLeft()
        .scale(y)
        .tickFormat(d3.format('.0%'))

    var brush = d3.brush()
        .extent([[0, 0], [swidth, sheight]])
        .on('start brush', function () {
            var selection = d3.event.selection
            var x0 = x.invert(selection[0][0])
            var x1 = x.invert(selection[1][0])
            var y0 = y.invert(selection[1][1])
            var y1 = y.invert(selection[0][1])

            onBrush(x0, x1, y0, y1)
        })

    var svg = d3.select('#scatterplot')
        .append('svg')
        .attr('width', swidth + margin.left + margin.right)
        .attr('height', sheight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

    var bg = svg.append('g')
    var gx = svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
    var gy = svg.append('g')
        .attr('class', 'y axis')

    gx.append('text')
        .attr('x', swidth)
        .attr('y', 35)
        .style('text-anchor', 'end')
        .style('fill', '#000')
        .style('font-weight', 'bold')
        .text('average duration (seconds)')

    gy.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', 0)
        .attr('y', -40)
        .style('text-anchor', 'end')
        .style('fill', '#000')
        .style('font-weight', 'bold')
        .text('sightings count')

    svg.append('g')
        .attr('class', 'brush')
        .call(brush)

    return function update(data) {
        x.domain(d3.extent(data, function (d) { return d.avgDurationSecs })).nice()
        y.domain(d3.extent(data, function (d) { return d.sightingCountsByState })).nice()

        gx.call(xAxis)
        gy.call(yAxis)

        var bgRect = bg.selectAll('rect')
            .data(d3.pairs(d3.merge([[y.domain()[0]], color.domain(), [y.domain()[1]]])))
        bgRect.exit().remove()
        bgRect.enter().append('rect')
            .attr('x', 0)
            .attr('width', swidth)
            .merge(bgRect)
            .attr('y', function (d) { return y(d[1]) })
            .attr('height', function (d) { return y(d[0]) - y(d[1]) })
            .style('fill', function (d) { return color(d[0]) })

        var circle = svg.selectAll('circle')
            .data(data, function (d) { return d.state })
        circle.exit().remove()
        circle.enter().append('circle')
            .attr('r', 4)
            .style('stroke', '#fff')
            .merge(circle)
            .attr('cx', function (d) { return x(d.avgDurationSecs) })
            .attr('cy', function (d) { return y(d.sightingCountsByState) })
            .style('fill', function (d) { return color(d.sightingCountsByState) })
            .style('opacity', function (d) { return d.filtered ? 0.5 : 1 })
            .style('stroke-width', function (d) { return d.filtered ? 1 : 2 })
    }
}


// TODO REMOVE
/**
 * Draw the map.
 * @param topo
 */
// function drawMap(topo) {
//
//     svg.selectAll("path")   // select country objects (which don't exist yet)
//         .data(topojson.feature(topo, topo.objects.states).features)  // bind data to these non-existent objects
//         .enter().append("path") // prepare data to be appended to paths
//         .attr("class", "feature") // give them a class for styling and access later
//         .style("fill", "#333") // change map background
//         .attr("id", function(d) { return "code_" + d.properties.id; }, true)  // give each a unique id for access later
//         .attr("d", path) // create them using the svg path generator defined above
//         .attr("class", "states");
// }

/**
 * Get the current year the user has selected
 * @returns {*}
 */
function getCurrentYear() {
    return document.getElementById("slider").value;
}

/**
 * Fills the map with locations of the sightings by year
 */
function addSightingsByYear() {
    d3.selectAll(".sightings").remove();

    //get the current year
    var selectedYear = getCurrentYear();

    //filter our data: get sightings by year
    var sightingsByYear = initialData.filter(
        function(d) {
            if(d.country == "us") {
                return d.year == selectedYear;
            }
        }
    );

    // SIGHTINGS LOGIC
    //remove all current sightings for updateCommands

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

            mapTooltip.html(d.city + ", " + d.state + "</br>" + "<strong>Shape:</strong> " + d.shape + "</br>" + "<strong>Description: </strong>" + d.comments)
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

/**
 * Updates the year and count texts
 * @param year
 * @param data
 */
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

/**
 * Update the map if slide is moved
 */
d3.select("#slider").on("input",
    function() {
        addSightingsByYear();
    }
);

d3.select(self.frameElement).style("height", "675px");


window.onload = init();  // magic starts here


