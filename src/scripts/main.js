Promise.all([
    d3.json("data/us-atlas.json"),
    d3.csv("data/airports.csv")
]).then(function([us, airports]) {
    // Parse airport data
    airports.forEach(function(d) {
        d.LATITUDE = +d.LATITUDE;
        d.LONGITUDE = +d.LONGITUDE;
        d.DELAY_PERCENTAGE = +d.DELAY_PERCENTAGE;
    });

    const width = 960;
    const height = 600;
    let currentZoom = 1;
    
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);

    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(1000);

    const path = d3.geoPath()
        .projection(projection);

    // Create SVG and add zoom
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom);

    // Create main group
    const g = svg.append("g");

    // Add ocean background
    g.append("rect")
        .attr("class", "ocean")
        .attr("width", width)
        .attr("height", height);

    // Add states
    g.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("d", path);

    // Add state borders
    g.append("path")
        .attr("class", "state-borders")
        .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));

    // Create airports group
    const airportsGroup = g.append("g")
        .attr("class", "airports");

    function isWithinBounds(coords) {
        return coords && 
               coords[0] >= 0 && 
               coords[0] <= width && 
               coords[1] >= 0 && 
               coords[1] <= height;
    }

    function aggregateAirports(airports, zoomLevel) {
        if (zoomLevel >= 4) return airports;

        const cellSize = 50 / Math.max(0.5, zoomLevel);
        const aggregated = new Map();

        airports.forEach(airport => {
            const coords = projection([airport.LONGITUDE, airport.LATITUDE]);
            if (!isWithinBounds(coords)) return;

            const cellX = Math.floor(coords[0] / cellSize);
            const cellY = Math.floor(coords[1] / cellSize);
            const key = `${cellX}-${cellY}`;

            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    airports: [],
                    x: (cellX + 0.5) * cellSize,
                    y: (cellY + 0.5) * cellSize
                });
            }
            aggregated.get(key).airports.push(airport);
        });

        return Array.from(aggregated.values())
            .filter(group => isWithinBounds([group.x, group.y]))
            .map(group => {
                group.avgDelay = d3.mean(group.airports, d => d.DELAY_PERCENTAGE);
                return group;
            });
    }

    function updateAirports(zoomLevel) {
        const validAirports = airports.filter(d => {
            const coords = projection([d.LONGITUDE, d.LATITUDE]);
            return isWithinBounds(coords);
        });
    
        const aggregatedData = aggregateAirports(validAirports, zoomLevel);
    
        const airportMarkers = airportsGroup.selectAll("circle")
            .data(aggregatedData, d => d.airports ? `${d.x}-${d.y}` : d.IATA_CODE);
    
        // Remove old markers with transition
        airportMarkers.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .remove();
    
        // Add new markers
        const markersEnter = airportMarkers.enter()
            .append("circle")
            .attr("class", d => d.airports ? "aggregated-marker" : "airports circle")
            .attr("r", 0);
    
        // Update all markers with new sizes
        airportMarkers.merge(markersEnter)
            .transition()
            .duration(300)
            .attr("cx", d => d.airports ? d.x : projection([d.LONGITUDE, d.LATITUDE])[0])
            .attr("cy", d => d.airports ? d.y : projection([d.LONGITUDE, d.LATITUDE])[1])
            .attr("r", d => {
                if (d.airports) {
                    // Clustered airports: base size scaled by inverse of zoom
                    return Math.min(Math.sqrt(d.airports.length) * (3 / currentZoom), 15);
                } else {
                    // Individual airports: smaller as zoom increases
                    return Math.max(3 / currentZoom, 1);
                }
            })
            .attr("fill", d => d.airports ? 
                d3.interpolateReds(d.avgDelay / 25) : 
                d3.interpolateReds(d.DELAY_PERCENTAGE / 25));
    }

    function zoomed(event) {
        currentZoom = event.transform.k;
        g.attr("transform", event.transform);
        updateAirports(currentZoom);
    }

    // Initialize map
    updateAirports(1);

    // Zoom controls
    d3.select("#zoom-in").on("click", () => {
        svg.transition()
            .duration(750)
            .call(zoom.scaleBy, 2);
    });

    d3.select("#zoom-out").on("click", () => {
        svg.transition()
            .duration(750)
            .call(zoom.scaleBy, 0.5);
    });

    d3.select("#reset").on("click", () => {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    });

}).catch(error => {
    console.error("Error loading the data:", error);
});