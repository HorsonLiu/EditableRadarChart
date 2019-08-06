// Export function SpiderChart.
// id: Dom element id, e.g. "#someChart";
// axes: Array of strings; The names of axes; e.g. ["Weight", "Height"];
// data: Array of float Array; e.g. [[12.0, 0.5], [12.1, 0.7]];
// options: Object of configures in the same format with var cfg below;
// onEdit: Callback function that will be invoked when drag ended;
function SpiderChart(id, axes, data, options, onEdit) {
    const model_count = data.length;
    var cfg = {
        w: 300, // Width of the chart.
        h: 300, // Height of the chart.
        margin: {top: 60, right: 60, bottom: 60, left: 60}, // The margins of the SVG.
        levels: 5,                      // Count of background levels.
        maxValue: 1.0,                  // The value that the outermost level represents.
        labelPositionRatio: 1.2,        // Represents the distance of the labels of axes from the center relative to the outermost level.
        textWrapWidth: 60,              // The number of pixels after which a label needs to be given a new line.
        areaOpacity: 0.35,              // The opacity of the area of the model.
        vertexRadius: 6,                // The size of the vertexes.
        backgroundOpacity: 0.1,         // The opacity of the background.
        strokeWidth: 2,                 // The width of the stroke around each model.
        color: d3.scale.category10()    // Color function(i) for models.
    };
    // Update configures
    if ('undefined' !== typeof options) {
        for (var i in options) {
            if ('undefined' !== typeof options[i]) {
                cfg[i] = options[i];
            }
        }
    }

    var maxAxisValues = [];
    var radius = Math.min(cfg.w / 2, cfg.h / 2);	 	                // Radius of the outermost circle
    var FormatValue = d3.format('%');		 	                        // Percentage formatting
    var angleSlice = Math.PI * 2 / axes.length;		                // The width in radians of each "slice"

    // Scale from data value to radius
    var rScale = d3.scale.linear()
        .range([0, radius])
        .domain([0, cfg.maxValue]);

    // Remove whatever chart with the same id/class was present before
    d3.select(id).select("svg").remove();

    // Initiate the spider chart SVG
    var svg = d3.select(id).append("svg")
        .attr("width", cfg.w + cfg.margin.left + cfg.margin.right)
        .attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
        .attr("class", "spider" + id);
    // Append a g element
    var g = svg.append("g")
        .attr("transform", "translate(" + (cfg.w / 2 + cfg.margin.left) + "," + (cfg.h / 2 + cfg.margin.top) + ")");

    // Filter for the outside glow
    var filter = g.append('defs').append('filter').attr('id', 'glow'),
        feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur'),
        feMerge = filter.append('feMerge'),
        feMergeNode_1 = feMerge.append('feMergeNode').attr('in', 'coloredBlur'),
        feMergeNode_2 = feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Help function for radial line
    var spiderLine = d3.svg.line.radial()
        .interpolate("linear-closed")
        .radius(function (d) {
            return rScale(d);
        })
        .angle(function (d, i) {
            return i * angleSlice;
        });

    // Wrapper for the grid & axes
    var axisGrid = g.append("g").attr("class", "axisWrapper");

    // Background web
    var web = [];
    for (let i = cfg.levels; i > 0; i--) {
        let c = [];
        for (let j = 0; j < axes.length; j++) {
            c.push(cfg.maxValue * i / cfg.levels);
        }
        web.push(c);
    }
    axisGrid.selectAll(".levels")
        .data(web)
        .enter()
        .append("path")
        .attr("d", function (d, i) {
            return spiderLine(d);
        })
        .attr("class", "web")
        .style("stroke", "grey")
        .style("stroke-opacity", function (d, i) {
            return i==0?1.0:0.5;
        })
        .style("stroke-width", "1px")
        .style("fill", "none");

    // Init axis labels
    axisGrid.selectAll(".axisLabel")
        .data(d3.range(1, (cfg.levels + 1)).reverse())
        .enter().append("text")
        .attr("class", "axisLabel")
        .attr("x", 4)
        .attr("y", function (d) {
            return -d * radius / cfg.levels;
        })
        .attr("dy", "0.4em")
        .style("font-size", "10px")
        .attr("fill", "#737373")
        .text(function (d, i) {
            return FormatValue(cfg.maxValue * d / cfg.levels);
        });

    // Init axes
    var axis = axisGrid.selectAll(".axis")
        .data(axes)
        .enter()
        .append("g")
        .attr("class", "axis");
    // Append the lines
    axis.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", function (d, i) {
            maxAxisValues[i] = {x: rScale(cfg.maxValue) * Math.cos(angleSlice * i - Math.PI / 2), y: 0};
            return maxAxisValues[i].x;
        })
        .attr("y2", function (d, i) {
            maxAxisValues[i].y = rScale(cfg.maxValue) * Math.sin(angleSlice * i - Math.PI / 2);
            return maxAxisValues[i].y
        })
        .attr("class", "line")
        .style("stroke", "#EEEEEE")
        .style("stroke-width", "2px");

    // Append the labels at each axis
    axis.append("text")
        .attr("class", "legend")
        .style("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("x", function (d, i) {
            return maxAxisValues[i].x * cfg.labelPositionRatio;
        })
        .attr("y", function (d, i) {
            return maxAxisValues[i].y * cfg.labelPositionRatio;
        })
        .text(function (d) {
            return d
        })
        .call(wrapLongText, cfg.textWrapWidth);

    // Create a wrapper for the models
    var modelWrapper = g.selectAll(".spiderWrapper")
        .data(data)
        .enter().append("g")
        .attr("class", "spiderWrapper");

    // Init spider area
    modelWrapper
        .append("path")
        .attr("class", "spiderArea")
        .attr("d", function (d, i) {
            return spiderLine(d);
        })
        .attr("id", function (d, i) {
            return "spiderArea" + i;
        })
        .style("fill", function (d, i) {
            return cfg.color(i);
        })
        .style("fill-opacity", cfg.areaOpacity)
        .on('mouseover', function (d, i) {
            // Highlight current spider area
            d3.selectAll(".spiderArea")
                .transition().duration(200)
                .style("fill-opacity", 0.1);
            d3.select(this)
                .transition().duration(200)
                .style("fill-opacity", 0.7);
        })
        .on('mouseout', function () {
            // Reset spider areas opacity
            d3.selectAll(".spiderArea")
                .transition().duration(200)
                .style("fill-opacity", cfg.areaOpacity);
        });

    // Init spider strokes
    modelWrapper.append("path")
        .attr("class", "spiderStroke")
        .attr("d", function (d, i) {
            return spiderLine(d);
        })
        .attr("id", function (d, i) {
            return "spiderStroke" + i;
        })
        .style("stroke-width", cfg.strokeWidth + "px")
        .style("stroke", function (d, i) {
            return cfg.color(i);
        })
        .style("fill", "none")
        .style("filter", "url(#glow)");


    // Set up the small tooltip for when you hover over a model
    var tooltip = g.append("text")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // drag behavior for vertexes
    var drag = d3.behavior.drag()
        .on("drag", move)
        .on("dragend", dragend);

    function dragend(dobj, axisIndex, modelIndex) {
        if (modelIndex != model_count - 1) {
            return;
        }

        onEdit(axisIndex, data[modelIndex][axisIndex])
    }

    function move(dobj, axisIndex, modelIndex) {
        if (modelIndex != model_count - 1) {
            return;
        }
        this.parentNode.appendChild(this);
        var dragTarget = d3.select(this);

        var newY = 0, newX = 0, newValue = 0;
        var maxX = maxAxisValues[axisIndex].x;
        var maxY = maxAxisValues[axisIndex].y;

        if (Math.abs(maxX) < 1e-6) {
            newX = 0;
            newY = d3.event.dy + parseFloat(dragTarget.attr("cy"));
            if (Math.abs(newY) > Math.abs(maxY)) {
                newY = maxY;
            } else if (newY * maxY <= 0) {
                newY = 0
            }
            newValue = (cfg.maxValue * newY / maxY).toFixed(4);
        } else {
            newX = d3.event.dx + parseFloat(dragTarget.attr("cx"));
            if (Math.abs(newX) > Math.abs(maxX)) {
                newX = maxX;
            } else if (newX * maxX <= 0) {
                newX = 0
            }
            newY = newX * maxY / maxX;
            newValue = (cfg.maxValue * newX / maxX).toFixed(4);
        }

        // Update data
        data[modelIndex][axisIndex] = newValue;
        dragTarget.data()[0] = newValue;

        // Update view
        dragTarget
            .attr("cx", function () {
                return newX;
            })
            .attr("cy", function () {
                return newY;
            });

        g.select("#spiderArea" + modelIndex)
            .attr("d", spiderLine(data[modelIndex]));

        g.select("#spiderStroke" + modelIndex)
            .attr("d", spiderLine(data[modelIndex]));

        tooltip
            .attr('x', newX - 10)
            .attr('y', newY - 10)
            .text(FormatValue(newValue))
            .transition().duration(200)
            .style('opacity', 1);

    }

    // Append the vertexes of models
    modelWrapper.selectAll(".spiderVertex")
        .data(function (d, i) {
            return d;
        })
        .enter().append("circle")
        .attr("class", "spiderVertex")
        .attr("r", cfg.vertexRadius)
        .attr("cx", function (d, i) {
            return rScale(d) * Math.cos(angleSlice * i - Math.PI / 2);
        })
        .attr("cy", function (d, i) {
            return rScale(d) * Math.sin(angleSlice * i - Math.PI / 2);
        })
        .style("fill", function (d, i, j) {
            return cfg.color(j);
        })
        .style("fill-opacity", 0.8)
        .style("pointer-events", "all")
        .on("mouseover", function (d, i) {
            let newX = parseFloat(d3.select(this).attr('cx')) - 10;
            let newY = parseFloat(d3.select(this).attr('cy')) - 10;
            tooltip
                .attr('x', newX)
                .attr('y', newY)
                .text(FormatValue(d))
                .transition().duration(200)
                .style('opacity', 1);
        })
        .on("mouseout", function () {
            tooltip.transition().duration(200)
                .style("opacity", 0);
        })
        .style("cursor", "pointer")
        .call(drag);

    // Ref. http://bl.ocks.org/mbostock/7555321
    function wrapLongText(dom, width) {
        dom.each(function () {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.4, // ems
                y = text.attr("y"),
                x = text.attr("x"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    if (line.length == 0) {
                        word = ""
                    } else {
                        tspan.text(line.join(" "));
                        line = [word];
                    }
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }//wrapLongText

}//SpiderChart