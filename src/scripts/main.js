Promise.all([
    d3.json("data/us-atlas.json")
]).then(function([us]) {
    let currentYear = 2020; 
    let airports = [];

    // Initial load of data based on currentYear
    loadData(currentYear).then(() => {
        initializeVisualization();
    });

    // Function to load data based on year
    function loadData(year) {
        return d3.csv(`data/flights_${year}.csv`).then(function(data) {
            airports = data.map(d => {
                d.LATITUDE = +d.LATITUDE;
                d.LONGITUDE = +d.LONGITUDE;
                d.DELAY_PERCENTAGE = +d.DELAY_PERCENTAGE;
                d.pct_delayed = +d.pct_delayed;

                const connectionsStr = d.connections.replace(/'/g, '"').replace(/^"|"$/g, '');
                try {
                    d.connections = JSON.parse(connectionsStr);
                } catch (e) {
                    console.error(`Error parsing connections for airport ${d.ORIGIN}:`, e);
                    d.connections = [];
                }
                return d;
            });
        }).catch(error => {
            console.error(`Error loading data for year ${year}:`, error);
        });
    }

    const width = 960;
    const height = 600;
    let currentZoom = 1;
    let minPctDelayed = 0;
    let minConnections = 0;

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);

    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(1000);

    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleLinear()
        .domain([0, 45])
        .range(["blue", "red"]);

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom);

    const g = svg.append("g");

    g.append("rect")
        .attr("class", "ocean")
        .attr("width", width)
        .attr("height", height);

    g.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("d", path);

    g.append("path")
        .attr("class", "state-borders")
        .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));

    const connectionsGroup = g.append("g").attr("class", "connections");
    const airportsGroup = g.append("g").attr("class", "airports");

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const legendWidth = 300, legendHeight = 10;
    const legendSvg = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - legendWidth - 20},${height - 40})`);
    const gradient = legendSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "blue");
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red");

    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");
    legendSvg.append("text")
        .attr("class", "legend-title")
        .attr("x", 0)
        .attr("y", -10)
        .text("Percentage of Delayed Flights");
    legendSvg.append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 15)
        .text("0%");
    legendSvg.append("text")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "end")
        .text("100%");

    let debounceTimeout;

    function clusterAirports(data, clusterRadius) {
        const clusters = [];

        data.forEach(airport => {
            const coords = projection([airport.LONGITUDE, airport.LATITUDE]);
            if (!coords) return;
            let foundCluster = null;

            for (const c of clusters) {
                const dx = coords[0] - c.x;
                const dy = coords[1] - c.y;
                if (Math.sqrt(dx * dx + dy * dy) <= clusterRadius) {
                    foundCluster = c;
                    break;
                }
            }

            if (foundCluster) {
                foundCluster.airports.push(airport);
                foundCluster.count++;
                foundCluster.x = (foundCluster.x * (foundCluster.count - 1) + coords[0]) / foundCluster.count;
                foundCluster.y = (foundCluster.y * (foundCluster.count - 1) + coords[1]) / foundCluster.count;
            } else {
                clusters.push({
                    x: coords[0],
                    y: coords[1],
                    airports: [airport],
                    count: 1
                });
            }
        });

        return clusters.map(c => {
            const avgPctDelayed = d3.mean(c.airports, d => d.pct_delayed);
            return {
                x: c.x,
                y: c.y,
                airports: c.airports,
                count: c.count,
                pct_delayed: avgPctDelayed
            };
        });
    }

    function zoomed(event) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            currentZoom = event.transform.k;
            g.transition()
                .duration(500)
                .attr("transform", event.transform);
            requestAnimationFrame(() => updateAirports());
        }, 100);
    }

    function updateAirports() {
        const validAirports = airports.filter(d => {
            const coords = projection([d.LONGITUDE, d.LATITUDE]);
            return coords !== null && d.pct_delayed >= minPctDelayed && d.connections.length >= minConnections;
        });

        const clusterRadius = currentZoom >= 6 ? 0 : 40 / currentZoom;

        const clusters = clusterRadius > 0 ? clusterAirports(validAirports, clusterRadius) : validAirports.map(d => ({
            x: projection([d.LONGITUDE, d.LATITUDE])[0],
            y: projection([d.LONGITUDE, d.LATITUDE])[1],
            airports: [d],
            count: 1,
            pct_delayed: d.pct_delayed
        }));

        const clusterMarkers = airportsGroup.selectAll("circle")
            .data(clusters, d => d.x + "_" + d.y);

        clusterMarkers.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .remove();

        const markersEnter = clusterMarkers.enter()
            .append("circle")
            .attr("class", "airport")
            .attr("r", 0)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("fill", d => colorScale(d.pct_delayed))
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                const countStr = d.count > 1
                    ? `Cluster of ${d.count} airports<br>`
                    : `Airport: ${d.airports[0].ORIGIN}<br>`;
                tooltip.html(`
                    <strong>${countStr}</strong>
                    <strong>Avg Delayed%:</strong> ${d3.format(".1f")(d.pct_delayed)}%
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .on("click", function(event, d) {
                if (d.count > 1) {
                    console.log(`Clicked on cluster with ${d.count} airports:`, d.airports.map(a => a.ORIGIN));
                } else {
                    console.log(`Clicked on single airport: ${d.airports[0].ORIGIN}`);
                    toggleConnections(d.airports[0]);
                }
            });

        markersEnter.transition()
            .duration(500)
            .attr("r", d => Math.max(3 / currentZoom, 3 + (d.count - 1)) );

        clusterMarkers.merge(markersEnter)
            .transition()
            .duration(300)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => Math.max(3 / currentZoom, 3 + (d.count - 1)) )
            .attr("fill", d => colorScale(d.pct_delayed));
    }

    function toggleConnections(selectedAirport) {
        console.log(`Toggling connections for airport: ${selectedAirport.ORIGIN}`);
        console.log(`Connections: ${selectedAirport.connections}`);

        const existingConnections = connectionsGroup.selectAll("path.connection")
            .filter(function() {
                return d3.select(this).attr("origin") === selectedAirport.ORIGIN;
            });

        if (!existingConnections.empty()) {
            existingConnections.transition()
                .duration(500)
                .attr("stroke-width", 0)
                .style("opacity", 0)
                .remove();
            console.log(`Removed connections for airport: ${selectedAirport.ORIGIN}`);
            return;
        }

        selectedAirport.connections.forEach(dest => {
            const destAirport = airports.find(a => a.ORIGIN === dest.trim());
            if (destAirport) {
                const originCoords = projection([selectedAirport.LONGITUDE, selectedAirport.LATITUDE]);
                const destCoords = projection([destAirport.LONGITUDE, destAirport.LATITUDE]);
                if (originCoords && destCoords) {
                    connectionsGroup.append("path")
                        .attr("class", "connection")
                        .attr("d", `M${originCoords[0]},${originCoords[1]}
                                    L${originCoords[0]},${originCoords[1]}`)
                        .attr("stroke", "orange")
                        .attr("stroke-width", 2)
                        .attr("fill", "none")
                        .attr("origin", selectedAirport.ORIGIN)
                        .attr("destination", destAirport.ORIGIN)
                        .transition()
                        .duration(1000)
                        .attr("d", `M${originCoords[0]},${originCoords[1]}
                                    L${destCoords[0]},${destCoords[1]}`)
                        .style("opacity", 0.8);
                } else {
                    console.warn(`Invalid coordinates for connection from ${selectedAirport.ORIGIN} to ${destAirport.ORIGIN}`);
                }
            } else {
                console.warn(`Destination airport not found for code: ${dest}`);
            }
        });
    }

    function initializeVisualization() {
        updateAirports();

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

        // Filter controls
        d3.select("#apply-filters").on("click", () => {
            minPctDelayed = +d3.select("#pct-delayed").property("value");
            minConnections = +d3.select("#num-connections").property("value");
            updateAirports();
        });

        // Year filter control
        d3.select("#year-select").on("change", function() {
            currentYear = this.value;
            loadData(currentYear).then(() => {
                updateAirports();
            });
        });
    }

}).catch(error => {
    console.error("Error loading the data:", error);
});
