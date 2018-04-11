
// globals
var width = 0;
var height = 0;
var projection = 0;
var path = 0;
var svg = 0;
var initialData = {};
var sightingsByYearCountData = [];
var components = [];

// color for choropleth map and scatter plot
var color = d3.scaleThreshold()
    .domain([0.24, 0.28, 0.32])
    .range(['#fbb4b9', '#f768a1', '#c51b8a', '#7a0177']);

var mapTooltip = d3.select("body").append("div")
    .attr("class", "tooltipMap")
    .style("opacity", 0);

var comments = d3.select("#comments").append("div")
    .attr("class", "comments");

//make the pie chart all grey
var colorScheme = [
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF"
];


/**
 * Initialize.
 * Loads the data, processes it, then creates map and charts
 */
function init() {
    loadData();
}


/**
 * Loads the data.
 * https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/us.json
 */
function loadData() {
    d3.queue()   // queue function loads all external data files asynchronously
        .defer(d3.csv, "./data/scrubbed.csv", function (d) {
            return {
                year: d.year,
                city: d.city,
                state: d.state,
                shape: d.shape,
                latitude: +d.latitude,
                longitude: +d.longitude,
                datetime: d.datetime,
                country: d.country,
                durationsec: +d.durationsec,
                durationhours: d.durationhours,
                comments: d.comments,
                dateposted: d.dateposted
            }
        })  // and associated data in csv file
        .defer(d3.json, './us-states.json') // TODO
        .defer(d3.json, "./us.json")  // our geometries
        .await(processData);   // once all files are loaded, call the processData function passing
                               // the loaded objects as arguments
}

/**
 * Process the data.
 * @param error
 * @param topo
 * @param data
 */
function processData(error,results,features,topo) {
    if (error) {
        throw error
    }

    initialData = results;
    sightingsByYearCountData = aggregationsByYear(initialData);

    components = [
        choropleth(topo), // draw map
        scatterplot(onBrush)
    ]

    // TODO fix
    function update() {
        components.forEach(function (component) {
            component(sightingsByYearCountData)
        })
    }

    function onBrush(x0, x1, y0, y1) {
        var clear = x0 === x1 || y0 === y1
        sightingsByYearCountData.forEach(function (d) { // data
            d.filtered = clear ? false
                : d.avgDurationSecs < x0 || d.avgDurationSecs > x1 || d.sightingCountsByState < y0 || d.sightingCountsByState > y1
        })
        update()
    }

    update()
    addSightingsByYear();
}


/**
 * Get the roll up aggregations of the number of sightings by state
 * for the selected year and the roll up average of duration (in seconds)
 * for the years sightings by state.
 * @param data
 */
function aggregationsByYear(data) {

    // roll up the counts by year per state
    // key: year, values {key: state, value: count }
    var aggregations = d3.nest()
        .key(
            function(d){
                return d.year;
            }
        )
        .key(
            function(d){
                return d.state;
            }
        )
        .rollup(
            function(values) {
                var s = d3.sum(values, function(v) {
                    return v.durationsec;
                });

                return {
                    sightingCountsByState: values.length,
                    avgDurationSecs: (s / values.length)
                };
            }
        )
        .entries(data);

    //filter our data: get aggre data per state by year
    sightingsByYearCountData = aggregations.filter(
        function(d) {
            if(d.key == getCurrentYear()) {
                return d;
            }
        }
    );

    // flatten the rolled up values from d3
    var flatAggregations = [];
    var yearAggrs = sightingsByYearCountData[0].values;
    for (var i = 0; i < yearAggrs.length; i++){
        var obj = yearAggrs[i];
        var name = obj.key;

        flatAggregations.push({
            state: name,
            sightingCountsByState: obj.value.sightingCountsByState,
            avgDurationSecs: obj.value.avgDurationSecs,
        });
    }

    return flatAggregations;
}

/**
 * Create the choropleth map
 * @param topo
 * @returns {update}
 */
function choropleth(topo) { //topo
    width = 800;
    height = 500;

    projection = d3.geoAlbersUsa()
        //.translate([width/2, height/2]) // translate to center of screen
        //.scale([1000]); // scale things down so see entire US
        .scale([width * 1.25])
        .translate([width / 2, height / 2])

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
        .data(topojson.feature(topo, topo.objects.states).features)  // bind data to these non-existent objects
        .enter()
        .append('path') // prepare data to be appended to paths
        .attr('d', path) // create them using the svg path generator defined above
        .style('stroke', '#fff')
        .style('stroke-width', 1)

    return function update(data) {
        svg.selectAll('path')
            .data(data, function (d) {
                if(d.state == getCurrentYear() && (d.country == "us" || d.country == "") && d.state != "") {
                    return d.state
                }
            })
            .style('fill', function (d) {
                return d.filtered ? '#ddd' : color(d.sightingCountsByState)
            })
    }
}

function scatterplot(onBrush) {
    var margin = { top: 10, right: 15, bottom: 40, left: 75 }
    var swidth = 380 - margin.left - margin.right;
    var sheight = 250 - margin.top - margin.bottom;

    var x = d3.scaleLinear()
        .range([0, swidth])
    var y = d3.scaleLinear()
        .range([sheight, 0])

    var xAxis = d3.axisBottom()
        .scale(x)
    var yAxis = d3.axisLeft()
        .scale(y)

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

    //remove all current sightings for updateCommands
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

    //populate map with sightings by year (dots)
    var sightings = svg.selectAll(".sightings")
        .data(sightingsByYear).enter()
        .append("circle")
        .attr("cx", function(d) {
            try {
                return projection([d.longitude, d.latitude])[0];
            } catch (e) {
                // TODO do nothing for now
                // console.log(e);
            }
        })
        .attr("cy", function(d){

            try {
                return projection([d.longitude, d.latitude])[1];
            } catch (e) {
                // TODO do nothing for now
                // console.log(e);
            }
        })
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

    //update the pie chart
    updatePieChart("#chart", colorScheme, sightingsByYear);
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
 * Updates the pie chart on slider.
 * @param domElementToAppendTo
 * @param scheme
 * @param sightings
 */
function updatePieChart(domElementToAppendTo, scheme, sightings){
    // clearing DOM elements
    d3.selectAll(".tooltipChart").remove();
    d3.selectAll(".rect").remove();
    d3.selectAll(".arc").remove();
    d3.select(domElementToAppendTo).select("svg").remove();

    var countByShape = d3.nest()
        .key(
            function(d){
                return d.shape;
            }
        )
        .rollup(
            function(values){
                return values.length;
            }
        )
        .entries(sightings);

    // init the counts to 0
    var shapesData = [
        {label:"chevron",	value: 0},
        {label:"cigar",		value: 0},
        {label:"cross",		value: 0},
        {label:"cylinder",	value: 0},
        {label:"diamond",	value: 0},
        {label:"disk",		value: 0},
        {label:"fireball",	value: 0},
        {label:"formation",	value: 0},
        {label:"oval",	value: 0},
        {label:"pyramid",	value: 0},
        {label:"rectangle",	value: 0},
        {label:"sphere",	value: 0},
        {label:"triangle",	value: 0},
        {label:"other",		value: 0},
        {label:"unknown",	value: 0},
        {label:"light",	value: 0},
    ];

    //update values for shapesData
    for(var i = 0; i < countByShape.length; i++){
        for(var j = 0; j < shapesData.length; j++){
            if(countByShape[i].key == shapesData[j].label){
                shapesData[j].value = countByShape[i].value;
                continue;
            }
        }
    }

    var margin = {top: 50, bottom: 50, left: 50, right: 50};
    var width = 350 - margin.left - margin.right, height = width, radius = Math.min(width, height) / 2;

    shapesData.forEach(
        function(item){
            item.enabled = true;
        }
    );

    var color = d3.scaleOrdinal().range(scheme);
    var chart = d3.select(domElementToAppendTo)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(50);

    var pie = d3.pie()
        .sort(null)
        .value(function(d) { return d.value; });

    var tooltip = d3.select(domElementToAppendTo)
        .append('div')
        .attr('class', 'tooltipChart');

    tooltip.append('div')
        .attr('class', 'label');

    tooltip.append('div')
        .attr('class', 'count');

    tooltip.append('div')
        .attr('class', 'percent');

    var g = chart.selectAll('.arc')
        .data(pie(shapesData))
        .enter().append('g')
        .attr("class", "arc");

    g.append("path")
        .attr('d', arc)
        .attr('fill',
            function(d, i) {
                return color(d.data.label);
            }
        )
        .each(
            function(d){
                this._current = d;
            }
        );

    g.on('mouseover',
        function(d){
            var total = d3.sum(shapesData.map(
                function(d){
                    if(d.enabled)
                        return d.value;
                    return 0;
                }
            ));

            var percent = Math.round(1000 * d.data.value / total) / 10;
            tooltip.select('.label').html(d.data.label.toUpperCase()).style('color','black');
            tooltip.select('.count').html(d.data.value);
            tooltip.select('.percent').html(percent + '%');

            tooltip.style('display', 'block');
            tooltip.style('opacity',2);

            d3.select(this)
                .interrupt()
                .transition()
                .duration(300)
                .ease(d3.easeCubic)
                .attr('transform', 'scale(1.05)')


        }
    );

    g.on('mousemove',
        function(d){
            tooltip.style('top', (d3.event.layerY + 10) + 'px')
                .style('left', (d3.event.layerX - 25) + 'px');
        }
    );

    g.on('mouseout',
        function(){
            tooltip.style('display', 'none');
            tooltip.style('opacity',0);

            d3.select(this)
                .interrupt()
                .transition()
                .duration(300)
                .ease(d3.easeCubic)
                .attr('transform', 'scale(1)')
                .style('filter', 'none')
        }
    );

}

/**
 * Update the map if slide is moved
 */
d3.select("#slider").on("input", function() {
    addSightingsByYear();
});

d3.select(self.frameElement).style("height", "675px");


window.onload = init();  // magic starts here


