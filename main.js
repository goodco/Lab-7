Promise.all([ // load multiple files
	d3.json('airports.json'),
	d3.json('world-110.json')
]).then(([airports, worldmap]) => {
    let visType = 'force'
    
    const mapDisplay = topojson.feature(worldmap, worldmap.objects.countries)
    
    const width = 900
    const height = 600
    const svg = d3.select(".airport-chart").append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0,0, width, height])
    
    
    const projection = d3.geoMercator()
        .fitExtent(
            [[0,0], [width,height]],
            mapDisplay
            )
            
    const pathGen = d3.geoPath().projection(projection)

    const paths = svg.selectAll("path")
        .data(mapDisplay.features)
        .join(
            enter => enter.append("path")
                .attr("d", pathGen)
                .style("fill", "black")
                .attr("opacity", 0)
        )

    paths.append("title")
        .text(d => d.properties.name)

    svg.append("path")
        .datum(topojson.mesh(worldmap, worldmap.objects.countries))
        .attr("d", pathGen)
        .attr('fill', 'none')
          .attr('stroke', 'white')
        .attr("class", "subunit-boundary");

    const s = d3.scaleLinear()
        .domain(d3.extent(airports.nodes.map(d => d.passengers)))
        .range([5,10])

    airports.nodes.map(d => d.r = s(d.passengers))

    const forceNode = d3.forceManyBody().strength(-10)
    const forceLink = d3.forceLink(airports.links)
    const forceCollide = d3.forceCollide(d => d.r).iterations(3)
    const forceCenter = d3.forceCenter(width/2, height/2)

    const sim = d3.forceSimulation(airports.nodes)
        .force("center", forceCenter)
        .force("charge", forceNode)
        .force("collide", forceCollide)
        .force("link", forceLink)

    const links = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(airports.links)
        .join(
            enter => enter.append("line")
                .style("stroke", "rgb(255,177,177)")
        )

    const nodes = svg.append("g")
        .attr("class","nodes")
        .selectAll("circle")
        .data(airports.nodes)
        .join(
            enter => enter.append("circle")
                .attr("r", d => d.r)
                .style("fill", "red")
        )

    nodes.append("title")   
        .text(d => d.name)

    function ticked() {
        nodes
            .attr("cx", d => Math.max(d.r, Math.min(width - d.r, d.x)))
            .attr("cy", d => Math.max(d.r, Math.min(height - d.r, d.y)))
        links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
    }

    sim.on("tick", ticked)

    function startDrag(event, d) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function stopDrag(event, d) {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    const drag = d3.drag()
        .on("start", startDrag)
        .on("drag", dragged)
        .on("end", stopDrag)
    nodes.call(drag)

    drag.filter(_ => visType === "force")

function switchLayout() {
    if (visType === "map") {
            
            sim.stop()
            
            paths.attr("opacity",1)
            
            airports.nodes.map(d => {
                d.fx = projection([d.longitude, d.latitude])[0]
                d.fy = projection([d.longitude, d.latitude])[1]
            })
            
            airports.links.map(d => {
                d.source.fx = projection([d.source.longitude, d.source.latitude])[0]
                d.source.fy = projection([d.source.longitude, d.source.latitude])[1]
                d.target.fx = projection([d.target.longitude, d.target.latitude])[0]
                d.target.fy = projection([d.target.longitude, d.target.latitude])[1]
            })
             
            nodes.transition().duration(750)
                .attr("cx", d => d.fx)
                .attr("cy", d => d.fy)
            
            links.transition().duration(750)
                .attr("x1", d => d.source.fx)
                .attr("y1", d => d.source.fy)
                .attr("x2", d => d.target.fx)
                .attr("y2", d => d.target.fy)
        } else {

            airports.nodes.map(d => {
                d.fx = null
                d.fy = null
            })
            
            airports.links.map(d => {
                d.source.fx = null
                d.source.fy = null
                d.target.fx = null
                d.target.fy = null
            })

            nodes.transition().duration(750)
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
            
            links.transition().duration(750)
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y)

            setTimeout(function() {
                sim.alpha(0.2).restart()
              }, 750);
            paths.attr("opacity",0)
        }
    }

    d3.selectAll("input[name=chart-type]").on("change", event=>{
        visType = event.target.value;
        
        switchLayout()
    })
})