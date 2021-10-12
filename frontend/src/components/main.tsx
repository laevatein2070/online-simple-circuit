import React from 'react';
import { useEffect } from 'react';

import * as go from 'gojs';
import { ReactDiagram } from 'gojs-react';

import '../App.css';  // contains .diagram-component CSS


function initDiagram() {

  // define variable
  var red = "orangered";  // 0 or false
  var green = "forestgreen";  // 1 or true
  var KAPPA = 4 * ((Math.sqrt(2) - 1) / 3);


  const $ = go.GraphObject.make;
  // set your license key here before creating the diagram: go.Diagram.licenseKey = "...";
  const diagram =
    $(go.Diagram,
      {
        "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
        "draggingTool.isGridSnapEnabled": true,
        'undoManager.isEnabled': true,
        'clickCreatingTool.archetypeNodeData': { text: 'new text', color: 'lightblue' },
        'initialScale': 1.5,
      });
  
  // when the document is modified, add a "*" to the title
  diagram.addDiagramListener("Modified", function(e:any) {
    var idx = document.title.indexOf("*");
    if (diagram.isModified) {
      if (idx < 0) document.title += "*";
    } else {
      if (idx >= 0) document.title = document.title.substr(0, idx);
    }
  });

  // create a new Platte
  var palette = new go.Palette("palette");
  var palette2 = new go.Palette("palette2");

  // grid
  diagram.grid.visible = true;
  diagram.grid =
  $(go.Panel, go.Panel.Grid,  // or "Grid"
    { gridCellSize: new go.Size(10, 10) },
    $(go.Shape, "LineH", { stroke: "lightgray" }),
    $(go.Shape, "LineV", { stroke: "lightgray" })
  );

  go.Shape.defineFigureGenerator("HalfEllipse", function(shape, w, h) {
    return new go.Geometry()
      .add(new go.PathFigure(0, 0, true)
      .add(new go.PathSegment(go.PathSegment.Bezier, w, .5 * h, KAPPA * w, 0, w, (.5 - KAPPA / 2) * h))
      .add(new go.PathSegment(go.PathSegment.Bezier, 0, h, w, (.5 + KAPPA / 2) * h, KAPPA * w, h).close()))
      .setSpots(0, 0.156, 0.844, 0.844);
  });
  
  // creates relinkable Links that will avoid crossing Nodes when possible 
  // and will jump over other Links in their paths
  diagram.linkTemplate =
    $(go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 3,
        relinkableFrom: true, relinkableTo: true,
        selectionAdorned: false, // Links are not adorned when selected so that their color remains visible.
        shadowOffset: new go.Point(0, 0), shadowBlur: 5, shadowColor: "blue",
      },
      new go.Binding("isShadowed", "isSelected").ofObject(),
      $(go.Shape,
        { name: "SHAPE", strokeWidth: 2, stroke: red }), new go.Binding("stroke", "color").ofModel());
    
  // node template helpers (Tooltip when hover with mouse)
  var sharedToolTip =
    $("ToolTip",
      { "Border.figure": "RoundedRectangle" },
      $(go.TextBlock, { margin: 2 },
        new go.Binding("text", "", function(d) { return d.category; })));

  // node settings

  function nodeStyle() {
    return [new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    new go.Binding("isShadowed", "isSelected").ofObject(),
    {
      selectionAdorned: false,
      shadowOffset: new go.Point(0, 0),
      shadowBlur: 15,
      shadowColor: "blue",
      toolTip: sharedToolTip
    }];
  }

  function shapeStyle() {
    return {
      name: "NODESHAPE",
      fill: "black",
      desiredSize: new go.Size(100, 40),
    };
  }

  function nodeEllipse() {
    return {
      fill: "gray",
      desiredSize: new go.Size(8, 12),
    }
  }

  // for bottom output port and top input port
  function FromBottom(input: any) {
    return {
      desiredSize: new go.Size(6, 6),
      fill: "#c3c6cd",
      fromSpot: go.Spot.Bottom,
      fromLinkable: !input,
      toSpot: go.Spot.Top,
      toLinkable: input,
      cursor: "pointer"
    };
  }
  
  // for top output port and bottom input port
  function FromTop(input: any) {
    return {
      desiredSize: new go.Size(6, 6),
      fill: "#c3c6cd",
      fromSpot: go.Spot.Top,
      fromLinkable: !input,
      toSpot: go.Spot.Bottom,
      toLinkable: input,
      cursor: "pointer"
    };
  }

  // for input and output
  function InoutPort(input: any) {
    return {
      desiredSize: new go.Size(6, 6),
      fill: "#c3c6cd",
      fromSpot: go.Spot.Right, 
      fromLinkable: !input,
      toSpot: go.Spot.Left,
      toLinkable: input,
      cursor: "pointer"
    };
  }
  
  
  // define templates for each type of node

  var inputTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Circle", shapeStyle(),
        { fill: red }),
      $(go.Shape, "Rectangle", InoutPort(false),
        { portId: "", alignment: new go.Spot(0.4, 0.5) }, new go.Binding("fill", "color").ofModel()),
      { // if double-clicked, an input node will change its value, represented by the color.
        doubleClick: function(e, obj:any) {
          e.diagram.startTransaction("Toggle Input");
          var shp = obj.findObject("NODESHAPE");
          shp.fill = (shp.fill === green) ? red : green;
          updateStates();
          e.diagram.commitTransaction("Toggle Input");
        }
      }
    );

  var outputTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Square", shapeStyle(),
        { fill: "grey" }),
      $(go.Shape, "Rectangle", InoutPort(true),
        { portId: "", alignment: new go.Spot(0, 0.5) })
    );

  var andTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle()),
      $(go.Shape, "HalfEllipse", nodeEllipse(),
        { alignment: new go.Spot(0.05, 0.5)}),
      $(go.Shape, "Rectangle", FromBottom(true),
        { portId: "in1", alignment: new go.Spot(0.05, 0) }),//vcc
      $(go.Shape, "Rectangle", FromBottom(true),
        { portId: "in2", alignment: new go.Spot(0.2, 0) }),
      $(go.Shape, "Rectangle", FromBottom(true),
        { portId: "in3", alignment: new go.Spot(0.35, 0) }),
      $(go.Shape, "Rectangle", FromTop(false),
        { portId: "out4", alignment: new go.Spot(0.5, 0) }), //out4 of in2 in3
      $(go.Shape, "Rectangle", FromBottom(true),
        { portId: "in5", alignment: new go.Spot(0.65, 0) }),
      $(go.Shape, "Rectangle", FromBottom(true),
        { portId: "in6", alignment: new go.Spot(0.8, 0) }),
      $(go.Shape, "Rectangle", FromTop(false),
        { portId: "out7", alignment: new go.Spot(0.95, 0) }), //out7 of in5 in6
      $(go.Shape, "Rectangle", FromTop(true),
        { portId: "in8", alignment: new go.Spot(0.05, 1) }),
      $(go.Shape, "Rectangle", FromTop(true),
        { portId: "in9", alignment: new go.Spot(0.2, 1) }),
      $(go.Shape, "Rectangle", FromBottom(false),
        { portId: "out10", alignment: new go.Spot(0.35, 1) }), //out10 of in8 in9
      $(go.Shape, "Rectangle", FromTop(true),
        { portId: "in11", alignment: new go.Spot(0.5, 1) }),
      $(go.Shape, "Rectangle", FromTop(true),
        { portId: "in12", alignment: new go.Spot(0.65, 1) }),
      $(go.Shape, "Rectangle", FromBottom(false),
        { portId: "out13", alignment: new go.Spot(0.8, 1) }), //out13 of in11 in12
      $(go.Shape, "Rectangle", FromTop(true),
        { portId: "in14", alignment: new go.Spot(0.95, 1) }), //gnd
      $(go.TextBlock, { text: "And", stroke: "white" }),
    );

  var orTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle(),
          { fill: "black" }),
      $(go.TextBlock, { text: "or", stroke: "white" }),
    );

  var xorTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle(),
        { fill: "black" }),
      $(go.TextBlock, { text: "xor", stroke: "white" }),
    );

  var norTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle(),
          { fill: "black" }),
      $(go.TextBlock, { text: "nor", stroke: "white" }),
    );

  var xnorTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle()),
      $(go.TextBlock, { text: "xnor", stroke: "white" }),
    );

  var nandTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle()),
      $(go.TextBlock, { text: "nand", stroke: "white" }),
    );

  var notTemplate =
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle()),
      $(go.Shape, "Rectangle", InoutPort(true),
        { portId: "in", alignment: new go.Spot(0, 0.5) }),
      $(go.Shape, "Rectangle", InoutPort(false),
        { portId: "out", alignment: new go.Spot(1, 0.5) }),
      $(go.TextBlock, { text: "not", stroke: "white" }),
    );

  var ledTemplate = 
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle()),
      $(go.TextBlock, { text: "led", stroke: "white" }),
    );

  var resistorTemplate = 
    $(go.Node, "Spot", nodeStyle(),
      $(go.Shape, "Rectangle", shapeStyle()),
      $(go.TextBlock, { text: "resistor", stroke: "white" }),
  );

  // add the templates created above to diagram and palette
  diagram.nodeTemplateMap.add("input", inputTemplate);
  diagram.nodeTemplateMap.add("output", outputTemplate);
  diagram.nodeTemplateMap.add("and", andTemplate);
  diagram.nodeTemplateMap.add("or", orTemplate);
  diagram.nodeTemplateMap.add("xor", xorTemplate);
  diagram.nodeTemplateMap.add("not", notTemplate);
  diagram.nodeTemplateMap.add("nand", nandTemplate);
  diagram.nodeTemplateMap.add("nor", norTemplate);
  diagram.nodeTemplateMap.add("xnor", xnorTemplate);
  diagram.nodeTemplateMap.add("led", ledTemplate);
  diagram.nodeTemplateMap.add("resistor", resistorTemplate);
  
  // share the template map with the Palette
  palette.nodeTemplateMap = diagram.nodeTemplateMap;
  //will change to LED and such
  palette2.nodeTemplateMap = diagram.nodeTemplateMap;

  palette.model.nodeDataArray = [
    { category: "input" },
    { category: "output" },
    { category: "and" },
    { category: "or" },
    { category: "xor" },
    { category: "not" },
    { category: "nand" },
    { category: "nor" },
    { category: "xnor" },
  ];

  //will be changed to LED, resistor, etc.
  palette2.model.nodeDataArray = [
    { category: "led" },
    { category: "resistor" },
  ];

  loop();

  function loop() {
    setTimeout(function() { updateStates(); loop(); }, 250);
  }
  
  function updateStates() {
    var oldskip = diagram.skipsUndoManager;
    diagram.skipsUndoManager = true;
    // do all "input" nodes first
    diagram.nodes.each(function(node) {
      if (node.category === "input") {
        doInput(node);
      }
    });
    // now we can do all other kinds of nodes
    diagram.nodes.each(function(node) {
      switch (node.category) {
        case "and": doAnd(node); break;
        case "or": doOr(node); break;
        case "xor": doXor(node); break;
        case "not": doNot(node); break;
        case "nand": doNand(node); break;
        case "nor": doNor(node); break;
        case "xnor": doXnor(node); break;
        case "output": doOutput(node); break;
        case "input": break;  // doInput already called, above
      }
    });
    diagram.skipsUndoManager = oldskip;
  }

  function linkIsTrue(link:any) {  // assume the given Link has a Shape named "SHAPE"
    return link.findObject("SHAPE").stroke === green;
  }

  function setOutputLinks(node:any, color:any) {
    node.findLinksOutOf().each(function(link:any) { link.findObject("SHAPE").stroke = color; });
  }

  function setOutputLinksP(node:any, color:any, pid:any) {
    node.findLinksOutOf(pid).each(function(link:any) { link.findObject("SHAPE").stroke = color; });
  }

  function doInput(node:any) {
    setOutputLinks(node, node.findObject("NODESHAPE").fill);
  }

  function getvalue(node:any,pid:any){
    var value
    node.findLinksInto(pid).each( function(link:any) {value=link.findObject("SHAPE").stroke})
    return value
  }

  function setvalue(node:any,pid:any,val:any){
    node.findLinksOutOf(pid).each( function(link:any) {link.findObject("SHAPE").stroke=val})
  }

  function getinput10(node:any){
    var input = [red,red,red,red,red,red,red,red,red,red]
    
    input[0] = getvalue(node,"in1")!
    input[1] = getvalue(node,"in2")!
    input[2] = getvalue(node,"in3")!
    input[3] = getvalue(node,"in5")!
    input[4] = getvalue(node,"in6")!
    input[5] = getvalue(node,"in8")!
    input[6] = getvalue(node,"in9")!
    input[7] = getvalue(node,"in11")!
    input[8] = getvalue(node,"in12")!
    input[9] = getvalue(node,"in14")!

    return input
  }

  function doAnd(node:any) {
    var input = getinput10(node)

    if(input[0]===green && input[9]===green){ //vcc and gnd must active

      if(input[1]===green && input[2]===green) setvalue(node,"out4",green)
      else setvalue(node,"out4",red)

      if(input[3]===green && input[4]===green) setvalue(node,"out7",green)
      else setvalue(node,"out7",red)

      if(input[5]===green && input[6]===green) setvalue(node,"out10",green)
      else setvalue(node,"out10",red)

      if(input[7]===green && input[8]===green) setvalue(node,"out13",green)
      else setvalue(node,"out13",red)

    }

  }

  function doNand(node:any) {

  }
  function doNot(node:any) {

    var f:any = []
    var output:any = ''
      
        
    node.findLinksInto().each( function(link:any) {

      f.push(link.findObject("SHAPE").stroke)
          
        if (f[0] === green){
          var color = red
          output = color
        }
        else{
          var color = green
          output = color
        }
    
      //setOutputLinks(node, color);
    })

    node.findLinksOutOf().each( function(link:any) {

      link.findObject("SHAPE").stroke=output
    
      //setOutputLinks(node, color);
    })
  }

  function doOr(node:any) {

  }
  function doNor(node:any) {

  }

  function doXor(node:any) {

  }
  function doXnor(node:any) {

  }

  function doOutput(node:any) {
    // assume there is just one input link
    // we just need to update the node's Shape.fill
    node.linksConnected.each(function(link:any) { node.findObject("NODESHAPE").fill = link.findObject("SHAPE").stroke; });
  }

  return diagram;
}


// render function...
function Main() {

  useEffect(() => {
    document.title = "Online Simple Circuit"
  }, []);

  // for alert when exit page without saving change.
  // (disabled for now because it's so annoy while testing)
  /*window.addEventListener("beforeunload", (ev) => 
  {  
    ev.preventDefault();
    return ev.returnValue = 'Are you sure you want to close?';
  });*/

  return (
    <div>
      <div className="absolute flex items-center w-full h-16 bg-black">
          <h1 className="mx-4 text-white text-4xl">OSC</h1>
          <h1 className="mx-8 text-white text-xl">File</h1>
          <h1 className="mx-8 text-white text-xl">Edit</h1>
          <h1 className="mx-8 text-white text-xl">Menu</h1>
          <h1 className="mx-8 text-white text-xl">Menu</h1>
      </div>

      <div className="flex">
        <div className="mt-16 w-4/5 bg-gray-200 relative border-b border-black">
          <ReactDiagram
            initDiagram={initDiagram}
            divClassName='main-diagram'
            nodeDataArray={[]}
          />
          <div className="ml-4">
            <p>Drag an drop component from the right side</p>
            <div className="flex">
              <h1 className="pr-5">Ctrl+Z: Undo</h1>
              <h1 className="pr-5">Ctrl+Y: Redo</h1>
              <h1>Mouse wheel to zoom in/out</h1>
            </div>
          </div>
        </div>

        <div style={{height: "90vh"}} className="mt-16 w-1/5 flex flex-col bg-gray-100 border border-black">

          <div className="p-2 border-b border-black flex justify-between bg-blue-100">
            <h1>IC Gate</h1>
          </div>
          <div style={{height: "40vh"}} className="bg-gray-100" id="palette"></div>

          <div className="p-2 border-t border-b border-black flex justify-between bg-blue-100">
            <h1>Others</h1>
          </div>
          <div style={{height: "30vh"}} className="bg-gray-100" id="palette2"></div>

        </div>

      </div>
    </div>
  );
}

export default Main;