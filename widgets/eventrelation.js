/**
 * Created by Sven Charleer @ KU Leuven on 30/07/14.
 */



var eventRelation = function(){


    // properties

    var _users;
    var _content;
    var variableMinDate = {};
    var variableMaxDate = {};

    var svgW = 1200;
    var svgH = 800;


    var graphPadding = 38;
    var graphTransformX = [];
    var graphTransformY = [];
    var axisX = {};
    var axisY = {};
    var graphDays = 0;

    var id;



    //preprocess methods

    var preprocess_nodes = function(data)
    {
        var xf = crossfilter(data);
        var byEvents = xf.dimension(function(f){return f.event_type;});
        var byVerb =  xf.dimension(function(f){return f.verb;});
        byVerb.filter(function(d){
        if(d != "read" && d != "answer_given" && d != "startRun" && d != "like" && d != "delete_like")
                return d;
        });
        return byEvents.bottom(Infinity);
    }

    var preprocess_links = function(data)
    {
        var xf = crossfilter(data);
        var dim = xf.dimension(function(f){return f.verb;});
        return dim.top(Infinity);

    }

    var preprocess_users = function(data)
    {
        var xf = crossfilter(data);
        var dim = xf.dimension(function(f){return f.actor;});
        return dim.group().reduce(
            function(p,v){
                p.count++;return p;

            },
            function(p,v){
                p.count--;return p;},
            function(){return {count:0};}
        ).top(Infinity);
    }




    var addGraph = function(data, id, title, color,div) {

        var w = svgW;
        var h = svgH;
        var svg = d3.select(div)
            .append("svg")
            .attr("id", id )
            .attr("width", w)   // <-- Here
            .attr("height", h); // <-- and here!


        var xScale = d3.scale.linear()
            .domain([0, 20000])
            .range([graphPadding, w - graphPadding * 2]);
        var yMax = d3.max(data, function (d) {
            return (100)});
        var yScale = d3.scale.linear()
            .domain([0, yMax])
            .range([graphPadding, h+graphPadding]);



        axisX[id] = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .ticks(3);
        axisY[id] = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            .ticks(1);
        graphTransformX[id] = xScale;
        graphTransformY[id] = yScale;

        svg.append("g").attr("class","mainCircles");

        var zoom = d3.behavior.zoom()
            .scaleExtent([.1, 10])
            .on("zoom", er_zoomed);

        
        svg.call(zoom);

        var drag = d3.behavior.drag()
            .origin(
                function(d) { 
                    return d;
                }
                )
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragended);

    }


    var drawLines = function(nodes,type,root,nodeRadius,color)
    {
        var line = {x1:0,y1:0,x2:0,y2:0};
        var i = 0;

        nodes.each(function(e){

            if(i > 0)
            {

                line.x2 = this.getAttribute("cx");
                line.y2 = this.getAttribute("cy");
                if(type != "user")
                {

                    root.append("line")
                        .attr("hover",function(d){if(type == "hover") return true; else return false;})
                        .attr("x1",line.x1)
                        .attr("y1",line.y1)
                        .attr("x2",line.x2)
                        .attr("y2",line.y2)
                        .attr("stroke","white")
                        .attr("stroke-width",2)
                        .style("stroke-opacity", function(d){
                         if(type == "relation") return .05;
                         else 1.0;
                     });
                }
                else
                {
                    root.append("line")

                        .attr("x1",line.x1)
                        .attr("y1",function(d){ if(line.y1 < 0) return line.y1+nodeRadius*2; else return line.y1;})
                        .attr("x2",line.x2)
                        .attr("y2",line.y2)
                        .attr("stroke",color)
                        .attr("stroke-width",2)
                        .attr("line", "userLine")
                        ;
                }

                line.x1 = this.getAttribute("cx");
                line.y1 = this.getAttribute("cy");
            }
            else
            {
                line.x1 = this.getAttribute("cx");
                line.y1 = this.getAttribute("cy");
            }
            i++;
        })
    }

    var drawHoverLine = function(d,type)
    {
        console.log("hovering");
        //draw lines for this thread
        var svg = d3.select("#"+id);
        //if(filter.length == 0)
        {
            svg.selectAll("line[line='userLine']").remove();
           // return;
        }
         var colors = ["#33FF99","#33CCFF","#CCFF33","#FF0066","#CCFFFF","#FF66CC"];
        
            var nodes = svg.selectAll("[username='"+d.actor+"']");
            var mainBars = svg.select(".mainCircles");
            drawLines(nodes,"user",mainBars,3,colors[_users.indexOf("" + d.actor+ "")]);
       
    }


 



    var drawGraph_horizontal = function(data, links, users, id, color)
    {

        var svg = d3.select("#"+id);
        var mainBars = svg.select(".mainCircles");

        graphTransformX[id].domain([0, data.length]);

        d3.select("#axis"+id).call(axisX[id]);

        var globalVariables = {eventVsPosition:{},farthestEvent:undefined, lastEvent:undefined, highestX:350, highestY:0};


        var g = mainBars

                .append("g")
                .data([globalVariables])
                .attr("id",id+"_root")

            ;



        var circles = g.selectAll("g")
            .data(data)
            .attr("eventId" , function(d){
                    return d;})
    ;

        var colors = ["#33FF99","#33CCFF","#CCFF33","#FF0066","#CCFFFF","#FF66CC"];
        circles
            .enter()
            .append("g")
            .attr("vis", true)
            .attr("e" , function(d){
                return d.object_name;})
            .attr("verb", function(d){ return d.verb;})
            .attr("cy", function (d,i) {

                //get global vars
                var eventVsPosition = this.parentNode.__data__.eventVsPosition;
                var farthestEvent = this.parentNode.__data__.farthestEvent;
                var y;

                var structureIdentifier = d.object_name;

                this.setAttribute("column", true);

                // start of the cycle, reset all
                if(farthestEvent == undefined)
                {
                    
                    y = 60;
                    this.parentNode.__data__.eventVsPosition[structureIdentifier] = {x:0, y:y};
                    this.parentNode.__data__.farthestEvent = {event:d, x:0, y:y};
                     if(y > this.parentNode.__data__.highestY) this.parentNode.__data__.highestY = y;
                    
                    return y;

                }
             
                //we're in an existing thread, so continue on that thread
                if(eventVsPosition[structureIdentifier] != undefined)
                {
                     
                    
                        y = eventVsPosition[structureIdentifier].y;
                        this.parentNode.__data__.eventVsPosition[structureIdentifier].y = y;
                    

                    

                    if(y > this.parentNode.__data__.highestY) this.parentNode.__data__.highestY = y;
                    return y;// graphTransformX[id](x);

                }
                //we discovered a new thread, so go to the next column
                if(eventVsPosition[structureIdentifier] == undefined)
                {
                    this.setAttribute("column", true);
                    y =  farthestEvent.y + 30;
                    

                    this.parentNode.__data__.eventVsPosition[structureIdentifier]=  {x: 0, y:y}
                    this.parentNode.__data__.farthestEvent = {event:d, x:0, y:y};
                

                    

                    if(y > this.parentNode.__data__.highestY) this.parentNode.__data__.highestY = y;

                    return y;//graphTransformX[id](x);
                }
                console.log("ERROR: we missed a case!");



            })
            .attr("cx", function (d,i) {

                var eventVsPosition = this.parentNode.__data__.eventVsPosition;

                var x;

                var structureIdentifier = d.object;

                if(this.parentNode.__data__.lastEvent == undefined)
                    this.parentNode.__data__.lastEvent = d;
                x =  this.parentNode.__data__.highestX + 30;

                this.parentNode.__data__.lastEvent = d;
                this.parentNode.__data__.highestX = x;
                return x;//graphTransformY[id](y);
                

            })
            .attr("r", function(d)
            {
               // if(d.username == "Google_109002798505335212351")
                 //return 3;
                //else return 2;
                return 6;
            })
            .attr("fill", function(d) {

                return colors[_users.indexOf("" + d.actor+ "")];

            })
            
            .attr("isRoot", function(d){
                if(this.parentNode.__data__.eventVsPosition[d.object] == undefined)
                    return true;
                else return false;
            })
            .attr("username", function(d){
                return d.actor;
            })
            .append('svg:title')
            
            .text( function(d){
                return d.object + " " + d.starttime + " " + d.verb;
            })
        ;

        circles
            .exit()
            .remove();


        //draw lines
       links.forEach(function(l)
        {

            var svg = d3.select("#"+id);
            var nodes = svg.selectAll("[e='"+ l.object_name + "']");
            var mainBars = svg.select(".mainCircles");
            drawLines(nodes,"relation",mainBars,3);
        });

        

        mainBars
            .selectAll("g[vis]")
            .append("circle")
            .attr("r",6)

            .attr("fill",function(d){return this.parentNode.attributes.fill.value;})
            .attr("cx",
            function(d){
                return this.parentNode.attributes.cx.value;
            })
            .attr("cy",
            function(d){
                return this.parentNode.attributes.cy.value;
            })
            .on("mousedown",function(d){
                var d2 = this.parentNode.__data__;
                var div = d3.select(_content);
                div.selectAll("div").remove();
                div
                .append("div")
                .attr("class","content_data")
                .html( function(d){
                    return "<em>" + _users[d2.actor] + " commented:</em></br> " + JSON.stringify(d2);
                });
            })
             .on("mouseover", function(d){drawHoverLine(this.parentNode.__data__,"hover");})
            .on("mouseleave",function(d){
                d3.selectAll("line[hover='true']").remove();

            });;


            mainBars.selectAll("g[column='true']")
            .append("text")
             .attr("x",0)
            .attr("y",
            function(d){
                return this.parentNode.attributes.cy.value;
            })
           .attr("fill","white")
           .attr("font-size",8)
           .attr("width",100)
            .text(function(d){return this.parentNode.__data__.object_name;})


    }

    return {
        "highlightUsers" : function(filter)
        {
            var svg = d3.select("#"+id);
            //if(filter.length == 0)
            {
                svg.selectAll("line[line='userLine']").remove();
               // return;
            }
            var colors_for_users = ["#c9ffae","#f2ff87","#ff98ab","#a4d1ff" ];
            var t = 0;
            filter.forEach(function(f){
                var nodes = svg.selectAll("[username='"+f+"']");
                var mainBars = svg.select(".mainCircles");
                drawLines(nodes,"user",mainBars,3,colors_for_users[t%4]);
                t++;
            });

        },
        "init" : function(data, identifier, div, contentDiv,allUsers)
        {
            id = identifier;
            _content = contentDiv;
            _users = allUsers;
            var n = preprocess_nodes(data);
            var l = preprocess_links(data);
            var users = preprocess_users(data);
            addGraph(n,identifier,identifier,"#008293",div);
            drawGraph_horizontal(n,l,users, identifier, "#008293");

            

        },
        "delete" : function()
        {
            d3.select("#"+id).remove();
        },
        "dataUpdated" : function(data)
        {
            var n = preprocess_nodes(data);
            var l = preprocess_links(data);
            var users = preprocess_users(data);
            var svg = d3.select("#"+id);
            var mainBars = svg.select(".mainCircles").select("g").remove();
            svg.selectAll("line").remove();
            drawGraph_horizontal(n,l,users, id, "#008293");
        }

    }
};

function er_zoomed(d) {
  var svg = d3.select("svg");
  var rootG = d3.select("g[class='mainCircles']");
  rootG.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

function dragstarted(d) {
  d3.event.sourceEvent.stopPropagation();
  d3.select(this).classed("dragging", true);
}

function dragged(d) {
 var svg = d3.select("svg");
  var rootG = d3.select("g[class='mainCircles']");
  rootG.attr("x", d3.event.x).attr("y", d3.event.y);
}

function dragended(d) {
  d3.select(this).classed("dragging", false);
}
